param(
  [Parameter(Mandatory)][string]$StaticRoot,
  [Parameter(Mandatory)][string]$ContentFile,
  [Parameter(Mandatory)][string]$SourceCommit,
  [Parameter(Mandatory)][string]$RepositoryRoot
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
$siteRoot = Split-Path -Parent $PSScriptRoot
$encoding = [Text.Encoding]::GetEncoding(950, [Text.EncoderFallback]::ExceptionFallback, [Text.DecoderFallback]::ExceptionFallback)
function Simple([string]$text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return '' }
  return [Microsoft.VisualBasic.Strings]::StrConv($text, [Microsoft.VisualBasic.VbStrConv]::SimplifiedChinese, 0).Trim()
}
function SourceText([byte[]]$bytes, [int]$start, [int]$end, [int]$max) {
  $length = [int]$bytes[$start]
  if ($length -gt $max) { return '' }
  $text = [byte[]]::new($length)
  for ($i = 0; $i -lt $length; $i++) { $text[$i] = $bytes[$start + $end - $i] }
  try { return Simple ($encoding.GetString($text)) } catch { return '' }
}
function Word([byte[]]$bytes, [int]$offset, [int]$key, [int]$subtract) {
  return (([BitConverter]::ToUInt16($bytes, $offset) -bxor $key) - $subtract) -band 65535
}
function SourceFile([string]$name) {
  $content = (& git -C $RepositoryRoot show "${SourceCommit}:$name") -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "Unable to read $name at $SourceCommit" }
  return $content
}
function ReadCString([string]$source, [string]$name) {
  $match = [regex]::Match($source, [regex]::Escape($name) + '="((?:\\.|[^"\\])*)";')
  if (-not $match.Success) { throw "Missing $name in source" }
  return ('"' + $match.Groups[1].Value + '"' | ConvertFrom-Json)
}
$catalogText = [IO.File]::ReadAllText((Join-Path $siteRoot 'catalog.js'))
$previous = ($catalogText -replace '^window\.WLO_CATALOG\s*=\s*', '' -replace ';\s*$', '') | ConvertFrom-Json
$content = Get-Content -LiteralPath $ContentFile -Raw | ConvertFrom-Json
$reference = Invoke-RestMethod -Uri 'http://191.223.41.127/api/pets' -TimeoutSec 30
if (-not $reference.ok -or @($reference.pets).Count -lt 100) { throw 'Reference partner index is incomplete.' }

$itemBytes = [IO.File]::ReadAllBytes((Join-Path $StaticRoot 'national_Item.Dat'))
$npcBytes = [IO.File]::ReadAllBytes((Join-Path $StaticRoot 'pet-data/Npc.Dat'))
$skillBytes = [IO.File]::ReadAllBytes((Join-Path $StaticRoot 'pet-data/Skill.dat'))
if ($itemBytes.Length % 451 -ne 0 -or $npcBytes.Length % 138 -ne 0 -or $skillBytes.Length % 148 -ne 0) { throw 'Invalid source record framing.' }
$items = @{}
$voucherByNpc = @{}
for ($at = 451; $at -lt $itemBytes.Length; $at += 451) {
  $id = Word $itemBytes ($at + 16) 0xefc3 9
  $name = SourceText $itemBytes $at 14 14
  if ($id -eq 0 -or -not $name) { continue }
  $type = (($itemBytes[$at + 15] -bxor 0x9a) - 9) -band 255
  $effect = (($itemBytes[$at + 47] -bxor 0x9a) - 9) -band 255
  $npc = Word $itemBytes ($at + 413) 0xefc3 9
  $record = [byte[]]::new(451)
  [Array]::Copy($itemBytes, $at, $record, 0, 451)
  $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($record)).ToLowerInvariant()
  $items[[string]$id] = [ordered]@{
    id = [int]$id; name = $name; description = (SourceText $itemBytes ($at + 146) 254 254)
    type = [int]$type; effect = [int]$effect; npc = [int]$npc; hash = $hash
    wear = [int]((($itemBytes[$at + 46] -bxor 0x9a) - 9) -band 255)
    ability1 = (Word $itemBytes ($at + 30) 0xefc3 9); ability2 = (Word $itemBytes ($at + 32) 0xefc3 9)
    boxMember = (Word $itemBytes ($at + 425) 0xefc3 9)
  }
  if ($effect -eq 146 -and $npc -gt 0 -and $name -notmatch '测试|未开') {
    if (-not $voucherByNpc.ContainsKey([string]$npc)) { $voucherByNpc[[string]$npc] = [Collections.Generic.List[object]]::new() }
    $voucherByNpc[[string]$npc].Add([ordered]@{ id=[int]$id; name=$name })
  }
}
$skills = @{}
for ($at = 148; $at -lt $skillBytes.Length; $at += 148) {
  $id = Word $skillBytes ($at + 22) 28320 4
  $name = SourceText $skillBytes $at 20 20
  if ($id -gt 0 -and $name) {
    $skills[[string]$id] = [ordered]@{ id=[int]$id; name=$name; description=(SourceText $skillBytes ($at + 66) 30 30); sp=(Word $skillBytes ($at + 24) 28320 4) }
  }
}
$npcs = @{}
for ($at = 138; $at -lt $npcBytes.Length; $at += 138) {
  $id = Word $npcBytes ($at + 12) 21001 1
  $name = SourceText $npcBytes $at 10 10
  if ($id -eq 0 -or -not $name) { continue }
  $skillNames = @()
  foreach ($offset in @(58,60,62)) {
    $skillId = Word $npcBytes ($at + $offset) 21001 1
    if ($skillId -and $skills.ContainsKey([string]$skillId)) { $skillNames += $skills[[string]$skillId] }
  }
  $colors = @()
  foreach ($offset in @(18,22,26,30)) {
    $colors += [uint32](([BitConverter]::ToUInt32($npcBytes, $at + $offset) -bxor [uint32]195999510) - 1)
  }
  $npcs[[string]$id] = [ordered]@{
    id=[int]$id; name=$name; element=[int]((($npcBytes[$at + 57] -bxor 200) - 1) -band 255)
    type=[int]((($npcBytes[$at + 11] -bxor 200) - 1) -band 255)
    catchable=(((($npcBytes[$at + 34] -bxor 200) - 1) -band 255) -eq 0)
    level=[int]((($npcBytes[$at + 37] -bxor 200) - 1) -band 255)
    graphic=(Word $npcBytes ($at + 14) 21001 1); colors=$colors; skills=$skillNames
  }
}

$referenceIds = [Collections.Generic.HashSet[int]]::new()
foreach ($pet in $reference.pets) {
  foreach ($form in $pet.forms) { if ($npcs.ContainsKey([string]$form.id)) { [void]$referenceIds.Add([int]$form.id) } }
}
$used = [Collections.Generic.HashSet[int]]::new()
$pets = [Collections.Generic.List[object]]::new()
foreach ($pet in $previous.pets) {
  $forms = @()
  foreach ($form in $pet.forms) {
    $native = $npcs[[string]$form.id]
    if ($native) {
      $forms += [ordered]@{ id=$native.id; name=$native.name; element=$native.element; skills=@($native.skills); graphic=$native.graphic; colors=@($native.colors) }
    } else {
      $oldSkills = @($form.skills | ForEach-Object {
        if ($_ -is [string]) { [ordered]@{name=$_; description=''; sp=$null} }
        else { [ordered]@{name=[string]$_.name; description=[string]$_.description; sp=$_.sp} }
      })
      $forms += [ordered]@{ id=[int]$form.id; name=[string]$form.name; element=[int]$form.element; skills=$oldSkills }
    }
    [void]$used.Add([int]$form.id)
  }
  $native = $npcs[[string]$pet.id]
  $vouchers = @()
  if ($voucherByNpc.ContainsKey([string]$pet.id)) { $vouchers = @($voucherByNpc[[string]$pet.id]) }
  $isReference = if ($pet.PSObject.Properties['reference']) { [bool]$pet.reference } else { $true }
  $pets.Add([ordered]@{ id=[int]$pet.id; name=[string]$pet.name; element=[int]$pet.element; forms=$forms; featured=[bool]$pet.featured; catchable=($native -and $native.type -eq 7 -and $native.catchable); vouchers=$vouchers; reference=$isReference; level=if($native){$native.level}else{0} })
}
foreach ($native in $npcs.Values) {
  $id = [int]$native.id
  if ($used.Contains($id) -or $native.name -match '测试|预备|未开' -or $native.graphic -eq 0) { continue }
  $capture = $native.type -eq 7 -and $native.catchable
  $hasVoucher = $voucherByNpc.ContainsKey([string]$id)
  if (-not $capture -and -not $hasVoucher -and -not $referenceIds.Contains($id)) { continue }
  $vouchers = @()
  if ($hasVoucher) { $vouchers = @($voucherByNpc[[string]$id]) }
  $form = [ordered]@{ id=$id; name=$native.name; element=$native.element; skills=@($native.skills); graphic=$native.graphic; colors=@($native.colors) }
  $pets.Add([ordered]@{ id=$id; name=$native.name; element=$native.element; forms=@($form); featured=$false; catchable=$capture; vouchers=$vouchers; reference=$referenceIds.Contains($id); level=$native.level })
  [void]$used.Add($id)
}

$bags = @{}
foreach ($bag in $previous.bags) {
  $item = $items[[string]$bag.id]
  if (-not $item) { continue }
  $known = if ($bag.PSObject.Properties['known']) { [bool]$bag.known } else { $true }
  $bags["$($bag.kind):$($bag.id)"] = [ordered]@{ id=[int]$bag.id; name=$item.name; kind=[string]$bag.kind; items=@($bag.items); source=[string]$bag.source; description=$item.description; known=$known }
}
function RewardRows($rows) {
  $result = @()
  foreach ($row in $rows) {
    $item = $items[[string]$row.item]
    if ($item -and $row.count -gt 0) { $result += [ordered]@{id=[int]$row.item; name=$item.name; count=[int]$row.count} }
  }
  return ,$result
}
$configured = @{}
foreach ($entry in $content.active_values.PSObject.Properties) {
  if ($entry.Name -notmatch '^(lucky|pack):(\d+)$') { continue }
  $kind = $Matches[1]; $id = [int]$Matches[2]; $configured[$entry.Name] = $true
  $item = $items[[string]$id]
  if (-not $item -or -not $entry.Value.enabled) { [void]$bags.Remove($entry.Name); continue }
  $rows = @($entry.Value.rows)
  if ($kind -eq 'lucky') {
    $rows = @($rows | Where-Object { $_.weight -gt 0 })
    $weight = ($rows | Measure-Object -Property weight -Sum).Sum
    $relative = $id -ge 55677 -and $id -le 55679 -or $id -eq 56062 -or $id -ge 56085 -and $id -le 56112
    if ($weight -ne 10000 -and -not ($relative -and $weight -gt 0)) { [void]$bags.Remove($entry.Name); continue }
  }
  $members = RewardRows $rows
  if ($members.Count) { $bags[$entry.Name] = [ordered]@{id=$id; name=$item.name; kind=$kind; items=$members; source='本服配置'; description=$item.description; known=$true} }
  else { [void]$bags.Remove($entry.Name) }
}

# The installed server projects the legacy pack override for 34296 into its
# one-item random pool when the rows exactly match the original source pool.
$legacyOneYuan = $content.active_values.PSObject.Properties['pack:34296']
if ($legacyOneYuan -and -not $configured.ContainsKey('lucky:34296')) {
  [void]$bags.Remove('pack:34296')
  $configured['lucky:34296'] = $true
  $source = SourceFile 'src/OneYuanBag.g.cs'
  $match = [regex]::Match($source, 'SourceRow="34296=([^"]+)"')
  if (-not $match.Success) { throw 'Missing one-yuan bag source pool.' }
  $remaining = [Collections.Generic.List[object]]::new()
  foreach ($part in ($match.Groups[1].Value -split ',')) {
    $bits = $part -split ':'
    $remaining.Add([ordered]@{item=[int]$bits[0];count=[int]$bits[1];weight=[int]$bits[2]})
  }
  $matched = $true; $rows = @()
  foreach ($row in $legacyOneYuan.Value.rows) {
    $sourceRow = $remaining | Where-Object { $_.item -eq $row.item -and $_.count -eq $row.count } | Select-Object -First 1
    $item = $items[[string]$row.item]
    if (-not $sourceRow -or -not $item -or $row.cost -ne 0 -or $row.costCount -ne 0 -or $row.group -ne 0) { $matched=$false; break }
    [void]$remaining.Remove($sourceRow)
    $rows += [ordered]@{id=[int]$row.item;name=$item.name;count=[int]$row.count}
  }
  $box = $items['34296']
  if ($box -and $legacyOneYuan.Value.enabled -and $matched -and $remaining.Count -eq 0) {
    $bags['lucky:34296']=[ordered]@{id=34296;name=$box.name;kind='lucky';items=$rows;source='本服配置';description=$box.description;known=$true}
  }
}

$official = SourceFile 'src/OfficialProbabilityBags.g.cs'
foreach ($match in [regex]::Matches($official, '"(\d+)=((?:\d+:\d+:\d+,?)+)"')) {
  $id = [int]$match.Groups[1].Value; $key = "lucky:$id"
  if ($configured.ContainsKey($key) -or -not $items.ContainsKey([string]$id)) { continue }
  $members = @(); $weight = 0
  foreach ($part in ($match.Groups[2].Value -split ',')) {
    if (-not $part) { continue }; $bits = $part -split ':'; $item = $items[$bits[0]]
    if ($item -and [int]$bits[2] -gt 0) { $members += [ordered]@{id=[int]$bits[0]; name=$item.name; count=[int]$bits[1]}; $weight += [int]$bits[2] }
  }
  if ($weight -eq 10000 -and $members.Count) { $item=$items[[string]$id]; $bags[$key]=[ordered]@{id=$id;name=$item.name;kind='lucky';items=$members;source='本服程序资料';description=$item.description;known=$true} }
}

$announcement = SourceFile 'src/Announcement1565.g.cs'
$sourceObjects = (ReadCString $announcement 'ContentJson') | ConvertFrom-Json
$identities = (ReadCString $announcement 'IdentityJson') | ConvertFrom-Json -AsHashtable
foreach ($object in $sourceObjects) {
  if ($object.key -notmatch '^(pack|lucky):(\d+)$' -or $configured.ContainsKey($object.key)) { continue }
  $valid = $true
  foreach ($id in @($object.item) + @($object.rows | ForEach-Object item)) {
    $item = $items[[string]$id]; $identity = $identities[[string]$id]
    if (-not $item -or -not $identity -or $item.hash -ne $identity.sha256) { $valid=$false; break }
  }
  if (-not $valid) { continue }
  $item = $items[[string]$object.item]; $kind = $Matches[1]; $members = RewardRows $object.rows
  if ($members.Count) { $bags[$object.key]=[ordered]@{id=[int]$object.item;name=$item.name;kind=$kind;items=$members;source='本服程序资料';description=$item.description;known=$true} }
}
foreach ($box in $items.Values) {
  $key = "pack:$($box.id)"
  if ($box.type -ne 17 -or $box.effect -ne 0 -or -not $box.boxMember -or $configured.ContainsKey($key)) { continue }
  $member = $items[[string]$box.boxMember]
  if (-not $member) { continue }
  $bags[$key]=[ordered]@{id=$box.id;name=$box.name;kind='pack';items=@([ordered]@{id=$member.id;name=$member.name;count=1});source='本服程序资料';description=$box.description;known=$true}
}
$fixedPacks = @{
  '35990' = @(@(34804,1),@(34805,1))
  '35966' = @(@(51753,1),@(21801,1),@(63113,1),@(23454,1),@(24500,1))
}
foreach ($id in 35980..35984) { $fixedPacks[[string]$id] = @(@((27723 + $id - 35980),1),@(34688,50)) }
foreach ($id in $fixedPacks.Keys) {
  $key = "pack:$id"; $box = $items[$id]
  if (-not $box -or $configured.ContainsKey($key)) { continue }
  $rows = @(); $valid = $true
  foreach ($pair in $fixedPacks[$id]) {
    $member = $items[[string]$pair[0]]
    if (-not $member) { $valid=$false; break }
    $rows += [ordered]@{id=[int]$pair[0];name=$member.name;count=[int]$pair[1]}
  }
  if ($valid) { $bags[$key]=[ordered]@{id=[int]$id;name=$box.name;kind='pack';items=$rows;source='本服程序资料';description=$box.description;known=$true} }
}
$vip = SourceFile 'src/VipRewards.cs'
$fixed = [regex]::Match($vip, 'Fixed=\{([\s\S]+?)\};').Groups[1].Value
$entries = @([regex]::Matches($fixed, 'new ushort\[\]\{([^}]*)\}|null'))
if ($entries.Count -ne 30) { throw 'VIP box source has changed.' }
for ($index = 0; $index -lt $entries.Count; $index++) {
  $id = 35325 + $index; $key = "pack:$id"; $box = $items[[string]$id]
  if (-not $box -or $configured.ContainsKey($key) -or $entries[$index].Value -eq 'null') { continue }
  $numbers = @($entries[$index].Groups[1].Value -split ',' | ForEach-Object { [int]$_.Trim() })
  $rows = @(); $valid = $true
  for ($i = 0; $i -lt $numbers.Count; $i += 2) {
    $member = $items[[string]$numbers[$i]]
    if (-not $member) { $valid=$false; break }
    $rows += [ordered]@{id=$numbers[$i];name=$member.name;count=$numbers[$i+1]}
  }
  if ($valid) { $bags[$key]=[ordered]@{id=$id;name=$box.name;kind='pack';items=$rows;source='本服程序资料';description=$box.description;known=$true} }
}
$vipBranches = @{
  '35344' = @(@{title='自选白金枪盾';key='pack:35344:choice:1';rows=@(@(12127,1),@(30101,50))},@{title='自选法翠枪盾';key='pack:35344:choice:2';rows=@(@(12128,1),@(30101,50))})
  '35345' = @(@{title='男性角色';key='pack:35345:body:male';rows=@(@(21262,1),@(51139,1))},@{title='女性角色';key='pack:35345:body:female';rows=@(@(21263,1),@(51139,1))})
}
foreach ($id in $vipBranches.Keys) {
  $box = $items[$id]; if (-not $box) { continue }; $branches = @(); $valid = $true
  foreach ($branch in $vipBranches[$id]) {
    $override = $content.active_values.PSObject.Properties[$branch.key]
    if ($override -and -not $override.Value.enabled) { $valid=$false; break }
    $sourceRows = if ($override) { @($override.Value.rows | ForEach-Object { ,@([int]$_.item,[int]$_.count) }) } else { $branch.rows }
    $rows = @()
    foreach ($pair in $sourceRows) {
      $member=$items[[string]$pair[0]];if(-not $member){$valid=$false;break}
      $rows += [ordered]@{id=[int]$pair[0];name=$member.name;count=[int]$pair[1]}
    }
    $branches += [ordered]@{title=$branch.title;items=$rows}
  }
  if ($valid) { $bags["pack:$id"]=[ordered]@{id=[int]$id;name=$box.name;kind='pack';items=@();branches=$branches;source='本服程序资料';description=$box.description;known=$true} }
}
$placements = @{}
foreach ($line in (Get-Content -LiteralPath (Join-Path $StaticRoot 'national_item_rules.txt'))) {
  if ($line -match '^(\d+)=[01],([01])$') { $placements[$Matches[1]] = $Matches[2] -eq '1' }
}
$soulBases = @(21509,22746,23271,24303); $soulWear = @(2,1,4,5); $soulAbility = @(207,208,210,211,214,215,216)
foreach ($id in @(56062) + @(56085..56112)) {
  $key = "lucky:$id"; $box = $items[[string]$id]
  if (-not $box -or $box.type -ne 41 -or $configured.ContainsKey($key) -or ($bags.ContainsKey($key) -and $bags[$key].known)) { continue }
  $firstSlot = if ($id -eq 56062) { 0 } else { [int][Math]::Floor(($id - 56085) / 7) }
  $lastSlot = if ($id -eq 56062) { 3 } else { $firstSlot }
  $firstStat = if ($id -eq 56062) { 0 } else { ($id - 56085) % 7 }
  $lastStat = if ($id -eq 56062) { 6 } else { $firstStat }
  $members = @(); $valid = $true
  for ($slot = $firstSlot; $slot -le $lastSlot; $slot++) {
    for ($stat = $firstStat; $stat -le $lastStat; $stat++) {
      for ($sub = 0; $sub -lt 6; $sub++) {
        $itemId = $soulBases[$slot] + $stat * 6 + $sub; $item = $items[[string]$itemId]
        if (-not $item -or $item.wear -ne $soulWear[$slot] -or $item.ability1 -ne $soulAbility[$stat] -or $item.ability2 -eq $item.ability1 -or -not $placements[[string]$itemId]) { $valid=$false; break }
        $members += [ordered]@{id=$itemId;name=$item.name;count=1}
      }
      if (-not $valid) { break }
    }
    if (-not $valid) { break }
  }
  $expected = if ($id -eq 56062) { 168 } else { 6 }
  if ($valid -and $members.Count -eq $expected) { $bags[$key]=[ordered]@{id=$id;name=$box.name;kind='lucky';items=$members;source='本服程序资料';description=$box.description;known=$true} }
}
foreach ($item in $items.Values) {
  if ($item.name -match '测试|未开') { continue }
  $kind = if ($item.type -eq 41 -or $item.name -match '福袋') { 'lucky' } elseif ($item.type -eq 26 -or $item.name -match '礼包|组合包') { 'pack' } else { $null }
  if (-not $kind) { continue }
  $key = "$kind`:$($item.id)"
  if (-not $bags.ContainsKey($key)) { $bags[$key]=[ordered]@{id=$item.id;name=$item.name;kind=$kind;items=@();source='物品资料';description=$item.description;known=$false} }
}
$data = [ordered]@{
  updated='2026-11-11'
  pets=@($pets | Sort-Object @{Expression={-([int]$_['featured'])}}, @{Expression={-([int]$_['reference'])}}, @{Expression={$_['name']}}, @{Expression={$_['id']}})
  bags=@($bags.Values | Sort-Object @{Expression={$_['kind']}}, @{Expression={-([int]$_['known'])}}, @{Expression={$_['name']}}, @{Expression={$_['id']}})
}
[IO.File]::WriteAllText((Join-Path $siteRoot 'catalog.js'), "window.WLO_CATALOG = " + ($data | ConvertTo-Json -Depth 20 -Compress) + ";`n", [Text.UTF8Encoding]::new($false))
$summary = [ordered]@{pets=$data.pets.Count;bags=$data.bags.Count}
[IO.File]::WriteAllText((Join-Path $siteRoot 'site-summary.js'), "window.WLO_SITE_COUNTS = " + ($summary | ConvertTo-Json -Compress) + ";`n", [Text.UTF8Encoding]::new($false))
$containerIds = @($data.bags | ForEach-Object { [int]$_.id } | Sort-Object -Unique)
[IO.File]::WriteAllText((Join-Path $siteRoot 'container-index.js'), "window.WLO_CONTAINER_IDS = " + ($containerIds | ConvertTo-Json -Compress) + ";`n", [Text.UTF8Encoding]::new($false))
"Partners $($data.pets.Count), forms $(($data.pets | ForEach-Object { $_.forms.Count } | Measure-Object -Sum).Sum), bags $($data.bags.Count), with contents $(($data.bags | Where-Object known).Count)"
