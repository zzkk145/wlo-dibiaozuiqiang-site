param(
  [Parameter(Mandatory)][string]$StaticRoot,
  [Parameter(Mandatory)][string]$ContentFile,
  [Parameter(Mandatory)][string]$ClientPicRoot,
  [Parameter(Mandatory)][string]$StageFile,
  [Parameter(Mandatory)][string]$StageExtensionFile,
  [Parameter(Mandatory)][string]$OperationsFile,
  [Parameter(Mandatory)][string]$CommerceFile,
  [Parameter(Mandatory)][string]$WorldPvpFile,
  [Parameter(Mandatory)][string]$OnlineDrawFile,
  [Parameter(Mandatory)][string]$SceneNamesFile,
  [Parameter(Mandatory)][string]$SourceCommit,
  [Parameter(Mandatory)][string]$RepositoryRoot
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Drawing
$siteRoot = Split-Path -Parent $PSScriptRoot
$catalogText = [IO.File]::ReadAllText((Join-Path $siteRoot 'catalog.js'))
$catalog = ($catalogText -replace '^window\.WLO_CATALOG\s*=\s*', '' -replace ';\s*$', '') | ConvertFrom-Json
$content = Get-Content -LiteralPath $ContentFile -Raw | ConvertFrom-Json
$operations = (Get-Content -LiteralPath $OperationsFile -Raw | ConvertFrom-Json -AsHashtable).values
$commerce = (Get-Content -LiteralPath $CommerceFile -Raw | ConvertFrom-Json).text | ConvertFrom-Json
$worldPvp = (Get-Content -LiteralPath $WorldPvpFile -Raw | ConvertFrom-Json).text | ConvertFrom-Json
$onlineDraw = (Get-Content -LiteralPath $OnlineDrawFile -Raw | ConvertFrom-Json).text | ConvertFrom-Json
$source = (& git -C $RepositoryRoot show "${SourceCommit}:src/ShentingDefinitions.g.cs") -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Unable to read the production Shenting definitions.' }
$match = [regex]::Match($source, 'Deserialize<Catalogue>\(@"([\s\S]+?)"\);')
if (-not $match.Success) { throw 'Unable to parse the Shenting definitions.' }
$shenting = $match.Groups[1].Value.Replace('""','"') | ConvertFrom-Json
$neededIds = [Collections.Generic.HashSet[int]]::new()
foreach ($bag in $catalog.bags) {
  [void]$neededIds.Add([int]$bag.id)
  foreach ($item in $bag.items) { [void]$neededIds.Add([int]$item.id) }
  foreach ($branch in $bag.branches) { foreach ($item in $branch.items) { [void]$neededIds.Add([int]$item.id) } }
}
$rewardEntries = @($content.active_values.PSObject.Properties | Where-Object {
  $_.Name -match '^(play:|newbie:creation$|arcade:|exchange:|drop-event:limited$)' -and $_.Value.enabled
})
foreach ($entry in $rewardEntries) {
  foreach ($item in $entry.Value.rows) { [void]$neededIds.Add([int]$item.item); if ($item.cost -gt 0) { [void]$neededIds.Add([int]$item.cost) } }
}
foreach ($campaign in $commerce.campaigns) { foreach ($tier in $campaign.tiers) { foreach ($item in $tier.rewards) { [void]$neededIds.Add([int]$item.item) } } }
foreach ($kind in $worldPvp.kinds) { foreach ($item in $kind.rewards) { [void]$neededIds.Add([int]$item.item) } }
foreach ($item in $onlineDraw.rewards) { [void]$neededIds.Add([int]$item.item) }
foreach ($stage in $shenting.stages) { foreach ($item in $stage.reward.items.PSObject.Properties) { [void]$neededIds.Add([int]$item.Name) } }
foreach ($offer in $shenting.exchange) { foreach ($item in $offer.items.PSObject.Properties) { [void]$neededIds.Add([int]$item.Name) } }
foreach ($key in $operations.Keys) { if ($key -match '^shenting\..*\.reward\.\d+\.id$' -and $operations[$key] -gt 0) { [void]$neededIds.Add([int]$operations[$key]) } }

$itemData = [IO.File]::ReadAllBytes((Join-Path $StaticRoot 'national_Item.Dat'))
if ($itemData.Length % 451 -ne 0) { throw 'Invalid item record framing.' }
$encoding = [Text.Encoding]::GetEncoding(950)
$items = @{}
for ($offset = 451; $offset -lt $itemData.Length; $offset += 451) {
  $id = (([BitConverter]::ToUInt16($itemData, $offset + 16) -bxor 0xefc3) - 9) -band 65535
  if (-not $neededIds.Contains([int]$id)) { continue }
  $length = [int]$itemData[$offset]
  if ($length -gt 14) { continue }
  $nameBytes = [byte[]]::new($length)
  for ($i = 0; $i -lt $length; $i++) { $nameBytes[$i] = $itemData[$offset + 14 - $i] }
  $name = [Microsoft.VisualBasic.Strings]::StrConv($encoding.GetString($nameBytes), [Microsoft.VisualBasic.VbStrConv]::SimplifiedChinese, 0).Trim()
  $picture = (([BitConverter]::ToUInt16($itemData, $offset + 18) -bxor 0xefc3) - 9) -band 65535
  $items[[string]$id] = [ordered]@{ id = [int]$id; name = $name; picture = [int]$picture }
}

$wantedPictures = [Collections.Generic.HashSet[int]]::new()
foreach ($item in $items.Values) { if ($item.picture -gt 1000) { [void]$wantedPictures.Add($item.picture) } }
$iconDir = Join-Path $siteRoot 'assets/item-icons'
[IO.Directory]::CreateDirectory($iconDir) | Out-Null
$foundPictures = [Collections.Generic.HashSet[int]]::new()
$archives = @('item_c02.bmg', 'item_c01.BMg', 'item_d01.bmg', 'item3_c01.BMg', 'item3.BMg', 'item1_d04.bmg', 'item1_d03.bmg', 'item1_d02.bmg', 'item1_d01.bmg', 'item1.bmg', 'item.bmg')
foreach ($archive in $archives) {
  $path = Join-Path $ClientPicRoot $archive
  if (-not (Test-Path -LiteralPath $path)) { continue }
  $stream = [IO.File]::OpenRead($path)
  $reader = [IO.BinaryReader]::new($stream)
  try {
    $count = $reader.ReadUInt16()
    for ($i = 0; $i -lt $count; $i++) {
      $stream.Position = 2 + $i * 32
      $length = $reader.ReadByte()
      if ($length -gt 23) { throw "Invalid archive index in $archive" }
      $name = [Text.Encoding]::ASCII.GetString($reader.ReadBytes($length))
      if ($name -notmatch '^(\d+)\.bmp$') { continue }
      $picture = [int]$Matches[1]
      if (-not $wantedPictures.Contains($picture) -or $foundPictures.Contains($picture)) { continue }
      $stream.Position = 2 + $i * 32 + 24
      $position = $reader.ReadUInt32()
      $size = $reader.ReadUInt32()
      if ($position + $size -gt $stream.Length) { throw "Invalid bitmap bounds in $archive" }
      $stream.Position = $position
      $bytes = $reader.ReadBytes([int]$size)
      $memory = [IO.MemoryStream]::new($bytes)
      try {
        $bitmap = [Drawing.Bitmap]::FromStream($memory)
        try {
          $bitmap.MakeTransparent([Drawing.Color]::FromArgb(0, 255, 0))
          $bitmap.Save((Join-Path $iconDir "$picture.png"), [Drawing.Imaging.ImageFormat]::Png)
        }
        finally { $bitmap.Dispose() }
      } finally { $memory.Dispose() }
      [void]$foundPictures.Add($picture)
    }
  } finally { $reader.Dispose(); $stream.Dispose() }
}

$images = [ordered]@{}
foreach ($item in ($items.Values | Sort-Object id)) {
  if ($foundPictures.Contains($item.picture)) { $images[[string]$item.id] = "assets/item-icons/$($item.picture).png" }
}
[IO.File]::WriteAllText((Join-Path $siteRoot 'item-images.js'), "window.WLO_ITEM_IMAGES = " + ($images | ConvertTo-Json -Compress) + ";`n", [Text.UTF8Encoding]::new($false))

$stageMaps = @{}
foreach ($file in @($StageFile, $StageExtensionFile)) {
  $text = [IO.File]::ReadAllText($file)
  foreach ($match in [regex]::Matches($text, 'new ChallengeStageConfiguration\(\s*(\d+)\s*,\s*(\d+)\s*,')) {
    $number = [int]$match.Groups[1].Value
    $map = [int]$match.Groups[2].Value
    if ($number -ge 5 -and $number -le 30) { $stageMaps[[string]$map] = $number }
  }
}
$zodiacNames = @('巨蟹宫', '狮子宫', '处女宫', '天秤宫', '天蝎宫', '射手宫', '摩羯宫', '水瓶宫', '双鱼宫')
$zeusNames = @{ '13502:3:4'='第一关'; '13503:3:3'='第二关'; '13500:3:3'='第三关'; '13501:2:3'='第四关'; '13501:4:11'='隐藏关' }
$sceneNames = @{}
foreach ($line in (Get-Content -LiteralPath $SceneNamesFile)) {
  if ($line -match '^(\d+)=(.+)$') { $sceneNames[$Matches[1]] = [Microsoft.VisualBasic.Strings]::StrConv($Matches[2], [Microsoft.VisualBasic.VbStrConv]::SimplifiedChinese, 0) }
}
$events = [ordered]@{ zodiac=@(); challenge=@(); zeus=@(); pirate=@(); treasure=@(); cooperation=@(); dungeon=@(); world=@(); shenting=@(); campaign=@(); draw=@(); newbie=@(); exchange=@(); arcade=@(); limited=@(); temple=@(); quiz=@(); wind=@(); team=@(); arena=@(); siege=@() }
$instanceSeen = @{}
foreach ($entry in $rewardEntries) {
  $key = $entry.Name
  $kind = $null; $title = $null; $mode = 'all'; $order = 0
  if ($key -match '^play:zodiac:(128\d+)$') {
    $index = [int]$Matches[1] - 12819
    if ($index -lt 0 -or $index -ge $zodiacNames.Count) { continue }
    $kind = 'zodiac'; $title = $zodiacNames[$index]; $order = $index + 4
  } elseif ($key -eq 'play:zodiac:athena') {
    $kind = 'zodiac'; $title = '雅典娜宝箱'; $mode = 'random'; $order = 13
  } elseif ($key -match '^play:activity:challenge:claim:(\d+):') {
    $number = $stageMaps[$Matches[1]]
    if (-not $number) { continue }
    $kind = 'challenge'; $title = "第${number}关"; $order = $number
  } elseif ($key -match '^play:activity:zeus:claim:(\d+:\d+:\d+)$') {
    $title = $zeusNames[$Matches[1]]
    if (-not $title) { continue }
    $kind = 'zeus'; $order = @('第一关','第二关','第三关','第四关','隐藏关').IndexOf($title) + 1
  } elseif ($key -eq 'play:activity:pirate:gift') {
    $kind = 'pirate'; $title = '守卫谢礼'; $mode = 'choice'; $order = 2
  } elseif ($key -eq 'play:activity:pirate:claim:12050:78:9') {
    $kind = 'pirate'; $title = '击败海盗'; $order = 1
  } elseif ($key -eq 'play:treasure:clear') {
    $kind = 'treasure'; $title = '第六关宝箱'; $order = 1
  } elseif ($key -match '^play:activity:cooperation:([012])$') {
    $number = [int]$Matches[1]; $kind = 'cooperation'; $order = $number + 1
    $title = @('协力对战', '挑战麦哲伦', '挑战郑和')[$number]
  } elseif ($key -match '^play:instance:(\d+):claim:') {
    $map = $Matches[1]; $kind = 'dungeon'; $order = [int]$map
    $title = if ($sceneNames.ContainsKey($map)) { $sceneNames[$map] } else { "副本 $map" }
    $signature = $map + ':' + (($entry.Value.rows | ForEach-Object { "$($_.item):$($_.count)" }) -join ',')
    if ($instanceSeen.ContainsKey($signature)) { continue }
    $instanceSeen[$signature] = $true
  } elseif ($key -eq 'newbie:creation') {
    $kind = 'newbie'; $title = '新角色福利'; $order = 1
  }
  if (-not $kind) { continue }
  $rows = @()
  foreach ($row in $entry.Value.rows) {
    $item = $items[[string]$row.item]
    if (-not $item -or -not $item.name) { throw "Missing name for reward item $($row.item)" }
    $rows += [ordered]@{ id = $item.id; name = $item.name; count = [int]$row.count }
  }
  $group = [ordered]@{ title = $title; mode = $mode; order = $order; items = $rows }
  if ($kind -eq 'dungeon') {
    $switch = "instance.$map.enabled"
    if ($operations.ContainsKey($switch)) { $group.note = if ($operations[$switch] -eq 0) { '快照中入口关闭' } else { '快照中入口开启' } }
  }
  $events[$kind] += $group
}

function NamedRows($rows) {
  $result = @()
  foreach ($row in $rows) {
    $item = $items[[string]$row.item]
    if (-not $item -or -not $item.name) { throw "Missing name for reward item $($row.item)" }
    $result += [ordered]@{id=$item.id; name=$item.name; count=[int]$row.count}
  }
  return ,$result
}
foreach ($kind in $worldPvp.kinds) {
  $name = @{10001='木箱';10002='银箱';10003='金箱'}[[int]$kind.id]
  $rows = @($kind.rewards | Where-Object { $_.weight -gt 0 })
  if ($rows.Count) { $events.world += [ordered]@{title=$name; mode='random'; order=[int]$kind.id; items=(NamedRows $rows)} }
}
$drawRows = @($onlineDraw.rewards | Where-Object { $_.weight -gt 0 })
if ($drawRows.Count) { $events.draw += [ordered]@{title='线上抽奖奖池';mode='random';order=1;items=(NamedRows $drawRows)} }
$exchangeTitles = @{'exchange:dialog:11094:5'='游乐场兑换员';'exchange:dialog:12000:40'='克兰村兑换员';'exchange:12230'='兑换窗口 12230';'exchange:12231'='兑换窗口 12231'}
foreach ($entry in $rewardEntries) {
  if ($entry.Name -eq 'drop-event:limited') {
    $rows=@()
    foreach ($row in $entry.Value.rows) {
      $item=$items[[string]$row.item]
      if ($item -and $row.weight -gt 0) { $rows += [ordered]@{id=$item.id;name=$item.name;count=[int]$row.count;probability=([decimal]$row.weight / 100)} }
    }
    $start=[DateTimeOffset]::FromUnixTimeSeconds([long]$entry.Value.settings.event_start_utc).ToOffset([TimeSpan]::FromHours(8)).ToString('yyyy-MM-dd HH:mm:ss')
    $end=[DateTimeOffset]::FromUnixTimeSeconds([long]$entry.Value.settings.event_end_utc).ToOffset([TimeSpan]::FromHours(8)).ToString('yyyy-MM-dd HH:mm:ss')
    $training=if($entry.Value.settings.include_training -eq 1){'包含练功岛'}else{'不含练功岛'}
    $note="快照启用 · $start 至 $end（结束时间不含） · 怪物等级 $($entry.Value.settings.min_level) 级及以上 · $training"
    if ($rows.Count) { $events.limited += [ordered]@{title='限时怪物额外掉落';mode='drop';order=1;note=$note;items=$rows} }
  } elseif ($entry.Name -match '^exchange:' -and $exchangeTitles.ContainsKey($entry.Name)) {
    $rows = @()
    foreach ($row in $entry.Value.rows) {
      $item=$items[[string]$row.item];$cost=$items[[string]$row.cost]
      if ($item -and $cost -and $row.count -gt 0 -and $row.costCount -gt 0) {
        $rows += [ordered]@{id=$item.id;name=$item.name;count=[int]$row.count;costId=$cost.id;costName=$cost.name;costCount=[int]$row.costCount}
      }
    }
    if ($rows.Count) { $events.exchange += [ordered]@{title=$exchangeTitles[$entry.Name];mode='exchange';order=$events.exchange.Count;items=$rows} }
  } elseif ($entry.Name -match '^arcade:(16|21|7:machine:\d+)$') {
    $code=$Matches[1]
    $name = if ($code -eq '16') { '翻翻乐' } elseif ($code -eq '21') { '转转乐' } else { '娃娃机 ' + ($code -split ':')[-1] + ' 号' }
    foreach ($pool in ($entry.Value.rows | Where-Object { $_.weight -gt 0 } | Group-Object group | Sort-Object { [int]$_.Name })) {
      $events.arcade += [ordered]@{title="$name · 奖池 $($pool.Name)";mode='pool';order=($events.arcade.Count + 1);note='各奖池按游戏内玩法进入，具体费用与结果以游戏内显示为准';items=(NamedRows $pool.Group)}
    }
  }
}

function ConfigValue([string]$key, [int]$fallback) {
  if ($operations.ContainsKey($key)) { return [int]$operations[$key] }
  return $fallback
}
function ShentingRows([string]$prefix, $original) {
  $old = @($original.PSObject.Properties | Sort-Object { [int]$_.Name })
  $rows = @()
  for ($index = 0; $index -lt 8; $index++) {
    $oldId = if ($index -lt $old.Count) { [int]$old[$index].Name } else { 0 }
    $oldCount = if ($index -lt $old.Count) { [int]$old[$index].Value } else { 0 }
    $id = ConfigValue ($prefix + 'reward.' + ($index + 1) + '.id') $oldId
    $legacyCount = if ($oldId) { ConfigValue ($prefix + 'item.' + $oldId) $oldCount } else { 0 }
    $count = ConfigValue ($prefix + 'reward.' + ($index + 1) + '.count') $legacyCount
    if ($id -gt 0 -and $count -gt 0) { $rows += [ordered]@{item=$id;count=$count} }
  }
  return ,$rows
}
foreach ($stage in $shenting.stages) {
  $prefix = "shenting.stage.$($stage.stage)."
  $rows = NamedRows (ShentingRows $prefix $stage.reward.items)
  $marks = ConfigValue ($prefix + 'marks') ([int]$stage.reward.marks)
  if ($marks -gt 0) { $rows += [ordered]@{id=0;name='神庭印记';count=$marks} }
  $events.shenting += [ordered]@{title="第$($stage.stage)关 · $($stage.title)";mode='all';order=[int]$stage.stage;items=$rows}
}
$exchangeNames = @{'forge.limiter'='限制器锻造';'forge.seraph'='炽天使锻造';'candy'='伙伴糖果';'recharge'='储值卡'}
$exchangeOrder = 20
foreach ($offer in $shenting.exchange) {
  $prefix = "shenting.exchange.$($offer.key)."
  if ((ConfigValue ($prefix + 'enabled') 1) -eq 0) { continue }
  $cost = ConfigValue ($prefix + 'cost') ([int]$offer.cost_marks)
  $note = "消耗 $cost 枚神庭印记，每周限 $($offer.weekly_limit) 次"
  if ($offer.shared_limit_group) { $note += '，同组兑换共享次数' }
  $events.shenting += [ordered]@{title="印记兑换 · $($exchangeNames[$offer.key])";mode='all';order=$exchangeOrder;note=$note;items=(NamedRows (ShentingRows $prefix $offer.items))}
  $exchangeOrder++
}

$campaignOrder = 0
foreach ($campaign in ($commerce.campaigns | Sort-Object @{Expression={-([int]$_.enabled)}}, name)) {
  $campaignOrder++
  $status = if ($campaign.enabled) { '快照启用' } else { '快照未启用' }
  $dates = ''
  if ($campaign.starts_at -and $campaign.ends_at) {
    $start = [DateTimeOffset]::new([DateTime]$campaign.starts_at).ToOffset([TimeSpan]::FromHours(8)).ToString('yyyy-MM-dd HH:mm')
    $end = [DateTimeOffset]::new([DateTime]$campaign.ends_at).ToOffset([TimeSpan]::FromHours(8)).ToString('yyyy-MM-dd HH:mm')
    $dates = " · $start 至 $end"
  }
  foreach ($tier in $campaign.tiers) {
    if ($campaign.kind -eq 'first') { $threshold = '首次储值' }
    elseif ($campaign.kind -eq 'recharge') { $threshold = '储值 ' + ([decimal]$tier.threshold / 100).ToString('0.##') + ' 元' }
    else { $threshold = '消费 ' + $tier.threshold + ' 点' }
    $note = $status + $dates
    if ($campaign.period -gt 0) {
      $period = if ($campaign.kind -eq 'recharge') { ([decimal]$campaign.period / 100).ToString('0.##') + ' 元' } else { $campaign.period.ToString() + ' 点' }
      $note += " · 每 $period 循环"
    }
    $events.campaign += [ordered]@{title="$($campaign.name) · $threshold";mode='all';order=$campaignOrder;note=$note;items=(NamedRows $tier.rewards)}
  }
}
foreach ($key in @($events.Keys)) { $events[$key] = @($events[$key] | Sort-Object -Stable { $_['order'] }) }
$eventData = [ordered]@{ updated = '2026-11-11'; events = $events }
[IO.File]::WriteAllText((Join-Path $siteRoot 'activity-data.js'), "window.WLO_ACTIVITIES = " + ($eventData | ConvertTo-Json -Depth 12 -Compress) + ";`n", [Text.UTF8Encoding]::new($false))
Write-Output "Items $($items.Count), icons $($foundPictures.Count), event groups $(($events.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum)"
