# Одноразовый bootstrap: git pull на сервере с сохранением obshchak.json
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..' | Resolve-Path | ForEach-Object { Join-Path $_ 'scripts\remote-refresh-site.ps1' })
# reuse env from remote-refresh by duplicating minimal block
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
if ((Test-Path $kontentEnv) -and ($envFile -like '*kit20-oauth.env*')) {
	$pk = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD'
	if ($pk) { $pw = $pk }
}
$hostLv = Get-EnvValue $envFile 'SERVER_LV_HOST'
if (-not $hostLv) { $hostLv = '194.113.209.152' }
$hk = 'ssh-ed25519 SHA256:HuSaSJtaQi7uJItHO0/A10c9e61lnnP4LuQXTrn/X1k'
$plink = 'C:\Program Files\PuTTY\plink.exe'
$remote = 'cd /var/www/kit20 && cp src/content/obshchak.json /tmp/obshchak-safe.json 2>/dev/null; git pull; test -f src/content/obshchak.json || cp /tmp/obshchak-safe.json src/content/obshchak.json'
& $plink -ssh "root@$hostLv" -pw $pw -batch -hostkey $hk $remote
