$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$localKit20Env = Join-Path $repoRoot 'kit20-oauth.env'
$kontentDirName = -join @(0x041A, 0x043E, 0x043D, 0x0442, 0x0435, 0x043D, 0x0442, 0x0417, 0x0430, 0x0432, 0x043E, 0x0434 | ForEach-Object { [char]$_ })
$kontentEnv = Join-Path $env:USERPROFILE (Join-Path 'Desktop' (Join-Path $kontentDirName '.env'))
$envFile = if (Test-Path $localKit20Env) { $localKit20Env } elseif (Test-Path $kontentEnv) { $kontentEnv } else { throw 'Missing env' }
function Get-EnvValue([string]$path, [string]$key) {
	$line = Get-Content -LiteralPath $path -Encoding UTF8 | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
	if (-not $line) { return '' }
	($line -replace "^\s*$key\s*=\s*", '').Trim()
}
$pw = Get-EnvValue $envFile 'SERVER_LV_SSH_PASSWORD'
$useKontentSsh = (Test-Path -LiteralPath $kontentEnv) -and ($envFile -like '*kit20-oauth.env*')
if ($useKontentSsh) { $pk = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD'; if ($pk) { $pw = $pk } }
if (-not $pw) { $pw = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD' }
$hk = 'ssh-ed25519 SHA256:HuSaSJtaQi7uJItHO0/A10c9e61lnnP4LuQXTrn/X1k'
$plink = 'C:\Program Files\PuTTY\plink.exe'
$remote = @'
cd /var/www/kit20
node scripts/verify-obshchak.mjs
node -e "const j=require('./src/content/obshchak.json'); console.log('expenses', j.expenses.length)"
test -f .git/hooks/post-merge && echo hook-ok
ls storage/last-known-good/ 2>/dev/null
ls storage/runtime-backups/ 2>/dev/null | tail -3
grep -c obshchak storage/admin-change-log/entries.jsonl 2>/dev/null || echo 0
'@
& $plink -ssh 'root@194.113.209.152' -pw $pw -batch -hostkey $hk $remote
