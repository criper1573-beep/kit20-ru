param([string]$Action = 'restore')
$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$localKit20Env = Join-Path $repoRoot 'kit20-oauth.env'
$kontentDirName = -join @(0x041A, 0x043E, 0x043D, 0x0442, 0x0435, 0x043D, 0x0442, 0x0417, 0x0430, 0x0432, 0x043E, 0x0434 | ForEach-Object { [char]$_ })
$kontentEnv = Join-Path $env:USERPROFILE (Join-Path 'Desktop' (Join-Path $kontentDirName '.env'))
$envFile = $null
if (Test-Path -LiteralPath $localKit20Env) { $envFile = $localKit20Env }
elseif (Test-Path -LiteralPath $kontentEnv) { $envFile = $kontentEnv }
else { throw 'Missing env' }
function Get-EnvValue([string]$path, [string]$key) {
	$line = Get-Content -LiteralPath $path -Encoding UTF8 | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
	if (-not $line) { return '' }
	($line -replace "^\s*$key\s*=\s*", '').Trim()
}
$pw = Get-EnvValue $envFile 'SERVER_LV_SSH_PASSWORD'
$useKontentSsh = (Test-Path -LiteralPath $kontentEnv) -and ($envFile -like '*kit20-oauth.env*')
if ($useKontentSsh) { $pk = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD'; if ($pk) { $pw = $pk } }
$hostLv = Get-EnvValue $envFile 'SERVER_LV_HOST'; if (-not $hostLv) { $hostLv = '194.113.209.152' }
$hk = 'ssh-ed25519 SHA256:HuSaSJtaQi7uJItHO0/A10c9e61lnnP4LuQXTrn/X1k'
$plink = 'C:\Program Files\PuTTY\plink.exe'

$remoteRestore = @'
set -e
cd /var/www/kit20
git pull --ff-only
node scripts/restore-content-from-snapshots.mjs
node scripts/reconstruct-admin-log-index.mjs
wc -l storage/admin-change-log/entries.jsonl
sudo chown -R www-data:www-data src/content storage
sudo systemctl restart kit20
systemctl is-active kit20
'@

$remoteIndex = @'
cd /var/www/kit20
git pull --ff-only
node scripts/reconstruct-admin-log-index.mjs
wc -l storage/admin-change-log/entries.jsonl
sudo chown www-data:www-data storage/admin-change-log/entries.jsonl
'@

$remote = if ($Action -eq 'index') { $remoteIndex } else { $remoteRestore }
& $plink -ssh "root@$hostLv" -pw $pw -batch -hostkey $hk $remote
