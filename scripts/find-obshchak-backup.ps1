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
$hostLv = Get-EnvValue $envFile 'SERVER_LV_HOST'; if (-not $hostLv) { $hostLv = '194.113.209.152' }
$hk = 'ssh-ed25519 SHA256:HuSaSJtaQi7uJItHO0/A10c9e61lnnP4LuQXTrn/X1k'
$plink = 'C:\Program Files\PuTTY\plink.exe'

$remote = @'
set -e
cd /var/www/kit20
echo === OLD NGINX LOGS obshchak PUT ===
zgrep -h 'PUT /api/admin/obshchak' /var/log/nginx/access.log* 2>/dev/null || true
echo === extundelete attempt ===
which extundelete || apt-get update -qq && apt-get install -y -qq extundelete 2>/dev/null || true
DEV=$(df /var/www/kit20 | tail -1 | awk '{print $1}')
echo DEV=$DEV
mkdir -p /tmp/obshchak-recover && cd /tmp/obshchak-recover
rm -rf RECOVERED_FILE* 2>/dev/null || true
extundelete $DEV --restore-file src/content/obshchak.json 2>&1 | tail -20 || true
find /tmp/obshchak-recover -name '*obshchak*' 2>/dev/null
find RECOVERED_FILE* -type f 2>/dev/null | while read f; do echo FOUND:$f; cat "$f" | head -50; done
echo === strings in deleted inodes via grep partition ===
grep -aob '"contributedKopeks"' $DEV 2>/dev/null | head -5 || true
'@

& $plink -ssh "root@$hostLv" -pw $pw -batch -hostkey $hk $remote
