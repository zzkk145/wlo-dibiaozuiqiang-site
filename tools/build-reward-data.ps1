param(
  [Parameter(Mandatory)][string]$StaticRoot,
  [Parameter(Mandatory)][string]$ContentFile,
  [Parameter(Mandatory)][string]$ClientPicRoot,
  [Parameter(Mandatory)][string]$StageFile,
  [Parameter(Mandatory)][string]$StageExtensionFile
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Drawing
$siteRoot = Split-Path -Parent $PSScriptRoot
$catalogText = [IO.File]::ReadAllText((Join-Path $siteRoot 'catalog.js'))
$catalog = ($catalogText -replace '^window\.WLO_CATALOG\s*=\s*', '' -replace ';\s*$', '') | ConvertFrom-Json
$content = Get-Content -LiteralPath $ContentFile -Raw | ConvertFrom-Json
$neededIds = [Collections.Generic.HashSet[int]]::new()
foreach ($bag in $catalog.bags) {
  [void]$neededIds.Add([int]$bag.id)
  foreach ($item in $bag.items) { [void]$neededIds.Add([int]$item.id) }
}
$rewardEntries = @($content.active_values.PSObject.Properties | Where-Object {
  $_.Name -match '^play:(zodiac:|activity:(pirate|zeus|challenge):|treasure:clear$)' -and $_.Value.enabled
})
foreach ($entry in $rewardEntries) {
  foreach ($item in $entry.Value.rows) { [void]$neededIds.Add([int]$item.item) }
}

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
$events = [ordered]@{ zodiac = @(); challenge = @(); zeus = @(); pirate = @(); treasure = @() }
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
  }
  if (-not $kind) { continue }
  $rows = @()
  foreach ($row in $entry.Value.rows) {
    $item = $items[[string]$row.item]
    if (-not $item -or -not $item.name) { throw "Missing name for reward item $($row.item)" }
    $rows += [ordered]@{ id = $item.id; name = $item.name; count = [int]$row.count }
  }
  $events[$kind] += [ordered]@{ title = $title; mode = $mode; order = $order; items = $rows }
}
foreach ($key in @($events.Keys)) { $events[$key] = @($events[$key] | Sort-Object { $_.order }) }
$eventData = [ordered]@{ updated = '2026-11-11'; events = $events }
[IO.File]::WriteAllText((Join-Path $siteRoot 'activity-data.js'), "window.WLO_ACTIVITIES = " + ($eventData | ConvertTo-Json -Depth 12 -Compress) + ";`n", [Text.UTF8Encoding]::new($false))
Write-Output "Items $($items.Count), icons $($foundPictures.Count), event groups $(($events.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum)"
