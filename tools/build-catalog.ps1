param(
  [Parameter(Mandatory)][string]$StaticRoot,
  [Parameter(Mandatory)][string]$ContentFile,
  [Parameter(Mandatory)][string]$RulesFile,
  [Parameter(Mandatory)][string]$OutputFile,
  [Parameter(Mandatory)][string]$ItemSha256,
  [Parameter(Mandatory)][string]$NpcSha256,
  [Parameter(Mandatory)][string]$SkillSha256,
  [Parameter(Mandatory)][string]$PackSha256,
  [Parameter(Mandatory)][string]$LuckySha256,
  [Parameter(Mandatory)][string]$ContentSha256
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
$encoding = [Text.Encoding]::GetEncoding(950, [Text.EncoderFallback]::ExceptionFallback, [Text.DecoderFallback]::ExceptionFallback)
function Assert-Hash([string]$path,[string]$hash) {
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant() -ne $hash.ToLowerInvariant()) { throw "Source fingerprint mismatch: $([IO.Path]::GetFileName($path))" }
}
function Simple([string]$s) { if([string]::IsNullOrWhiteSpace($s)){ return '' }; return [Microsoft.VisualBasic.Strings]::StrConv($s,[Microsoft.VisualBasic.VbStrConv]::SimplifiedChinese,0).Trim() }
function Reverse-Name([byte[]]$data,[int]$start,[int]$end,[int]$maximum) {
  $n=[int]$data[$start]; if($n -gt $maximum){return ''}; $b=[byte[]]::new($n)
  for($i=0;$i -lt $n;$i++){$b[$i]=$data[$start+$end-$i]}
  try { return Simple ($encoding.GetString($b)) } catch { return '' }
}
$itemPath=Join-Path $StaticRoot 'national_Item.Dat'
$npcPath=Join-Path $StaticRoot 'pet-data/Npc.Dat'
$skillPath=Join-Path $StaticRoot 'pet-data/Skill.dat'
$packPath=Join-Path $StaticRoot 'national_item_packs.txt'
$luckyPath=Join-Path $StaticRoot 'lucky_bags.txt';if(-not (Test-Path -LiteralPath $luckyPath)){$luckyPath=Join-Path $StaticRoot 'national-qualified-lucky-bags.txt'}
Assert-Hash $itemPath $ItemSha256; Assert-Hash $npcPath $NpcSha256; Assert-Hash $skillPath $SkillSha256; Assert-Hash $ContentFile $ContentSha256; Assert-Hash $packPath $PackSha256; Assert-Hash $luckyPath $LuckySha256
$itemData=[IO.File]::ReadAllBytes($itemPath); if($itemData.Length % 451 -ne 0){throw 'Invalid item record framing.'}
$itemNames=@{}
for($at=451;$at -lt $itemData.Length;$at+=451){
  $id=(([BitConverter]::ToUInt16($itemData,$at+16) -bxor 0xefc3)-9) -band 65535
  $name=Reverse-Name $itemData $at 14 14
  if($id -gt 0 -and $name){ if($itemNames.ContainsKey([string]$id)){throw "Duplicate item $id"}; $itemNames[[string]$id]=$name }
}
$content=Get-Content -LiteralPath $ContentFile -Raw | ConvertFrom-Json
$bagMap=[ordered]@{}
$disabled=@{}
foreach($entry in $content.active_values.PSObject.Properties){
  if($entry.Name -notmatch '^(lucky|pack):(\d+)$'){continue}
  $kind=$Matches[1];$id=[int]$Matches[2];$name=$itemNames[[string]$id]
  if(-not $entry.Value.enabled){$disabled[$entry.Name]=$true;continue}
  if(-not $name -or $name -match '测试|未开'){continue}
  if($kind -eq 'lucky' -and (($entry.Value.rows | Measure-Object -Property weight -Sum).Sum -ne 10000)){$disabled[$entry.Name]=$true;continue}
  $rows=@(foreach($row in $entry.Value.rows){if($row.item -gt 0 -and $row.count -gt 0 -and ($kind -ne 'lucky' -or $row.weight -gt 0)){$itemName=$itemNames[[string]$row.item];if(-not $itemName){$itemName="道具 $($row.item)"};[ordered]@{id=[int]$row.item;name=$itemName;count=[int]$row.count}}})
  if($rows.Count){$bagMap[$entry.Name]=[ordered]@{id=$id;name=$name;kind=$kind;items=$rows;source='本服配置'}}
}
foreach($source in @(@{path=$luckyPath;kind='lucky'},@{path=$packPath;kind='pack'})){
  foreach($line in (Get-Content -LiteralPath $source.path)){
    if($line -notmatch '^(\d+)=(.+)$'){continue};$id=[int]$Matches[1];$parts=$Matches[2];$key="$($source.kind):$id"
    if($bagMap.Contains($key) -or $disabled.ContainsKey($key)){continue};$name=$itemNames[[string]$id];if(-not $name -or $name -match '测试|未开'){continue}
    $rows=@(foreach($part in ($parts -split ',')){ $q=$part -split ':';if($q.Count -ge 2 -and $q[0] -match '^\d+$' -and $q[1] -match '^\d+$' -and ($source.kind -ne 'lucky' -or ($q.Count -ge 3 -and [int]$q[2] -gt 0))){$itemId=[int]$q[0];$itemName=$itemNames[[string]$itemId];if(-not $itemName){$itemName="道具 $itemId"};[ordered]@{id=$itemId;name=$itemName;count=[int]$q[1]}}})
    if($rows.Count){$bagMap[$key]=[ordered]@{id=$id;name=$name;kind=$source.kind;items=$rows;source='基础资料'}}
  }
}
$npcData=[IO.File]::ReadAllBytes($npcPath);$skillData=[IO.File]::ReadAllBytes($skillPath)
if($npcData.Length % 138 -ne 0 -or $skillData.Length % 148 -ne 0){throw 'Invalid companion record framing.'}
$skills=@{}
for($at=148;$at -lt $skillData.Length;$at+=148){$id=(([BitConverter]::ToUInt16($skillData,$at+22) -bxor 28320)-4) -band 65535;$name=Reverse-Name $skillData $at 20 20;if($id -gt 0 -and $name){$skills[[string]$id]=$name}}
$npcs=@{}
for($at=138;$at -lt $npcData.Length;$at+=138){
  $id=(([BitConverter]::ToUInt16($npcData,$at+12) -bxor 21001)-1) -band 65535;$name=Reverse-Name $npcData $at 10 10
  if(-not $id -or -not $name){continue};$element=(($npcData[$at+57] -bxor 200)-1) -band 255
  $skillNames=@(foreach($off in @(58,60,62)){$skillId=(([BitConverter]::ToUInt16($npcData,$at+$off) -bxor 21001)-1) -band 65535;if($skillId -and $skills[[string]$skillId]){$skills[[string]$skillId]}})
  $npcs[[string]$id]=[ordered]@{id=$id;name=$name;element=$element;skills=$skillNames}
}
$rules=Get-Content -LiteralPath $RulesFile -Raw
$section=($rules -split 'static readonly ushort\[\]\[\] Candy')[0]
$pairs=@(foreach($m in [regex]::Matches($section,'new ushort\[\]\{(\d+),(\d+),\d+,\d+,\d+\}')){ ,@([int]$m.Groups[1].Value,[int]$m.Groups[2].Value) })
$pairs+=,@(34580,34581);$pairs+=,@(34582,34583)
$pets=@();$seen=@{}
foreach($pair in $pairs){$base=$npcs[[string]$pair[0]];$advanced=$npcs[[string]$pair[1]];if(-not $base -or -not $advanced -or $seen.ContainsKey([string]$pair[0])){continue};$seen[[string]$pair[0]]=$true;$pets+=,[ordered]@{id=$base.id;name=$base.name;element=$base.element;forms=@($base,$advanced);featured=($base.id -in @(34580,34582))}}
$data=[ordered]@{updated='2026-11-11';bags=@($bagMap.Values | Sort-Object kind,name,id);pets=@($pets | Sort-Object @{Expression={-([int]$_.featured)}},name,id)}
$json=$data | ConvertTo-Json -Depth 20 -Compress
[IO.File]::WriteAllText($OutputFile, "window.WLO_CATALOG = $json;`n", [Text.UTF8Encoding]::new($false))
"Bags: $($data.bags.Count); partners: $($data.pets.Count); output: $OutputFile"
