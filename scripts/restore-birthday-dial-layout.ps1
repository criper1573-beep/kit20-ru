# Восстановить storage/birthday-dial-labels.json на VPS из .bak (без yulya-2)
$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$localKit20Env = Join-Path $repoRoot 'kit20-oauth.env'
$kontentDirName = -join @(0x041A, 0x043E, 0x043D, 0x0442, 0x0435, 0x043D, 0x0442, 0x0417, 0x0430, 0x0432, 0x043E, 0x0434 | ForEach-Object { [char]$_ })
$kontentEnv = Join-Path $env:USERPROFILE (Join-Path 'Desktop' (Join-Path $kontentDirName '.env'))

$envFile = $null
if ($env:KIT20_ENV_FILE -and (Test-Path -LiteralPath $env:KIT20_ENV_FILE)) { $envFile = $env:KIT20_ENV_FILE }
elseif (Test-Path -LiteralPath $localKit20Env) { $envFile = $localKit20Env }
elseif ($env:KIT20_KONTENT_ENV -and (Test-Path -LiteralPath $env:KIT20_KONTENT_ENV)) { $envFile = $env:KIT20_KONTENT_ENV }
elseif (Test-Path -LiteralPath $kontentEnv) { $envFile = $kontentEnv }
else { throw 'Missing env file' }

function Get-EnvValue([string]$path, [string]$key) {
	$line = Get-Content -LiteralPath $path -Encoding UTF8 | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
	if (-not $line) { return '' }
	($line -replace "^\s*$key\s*=\s*", '').Trim()
}

$pw = Get-EnvValue $envFile 'SERVER_LV_SSH_PASSWORD'
$useKontentSsh = (Test-Path -LiteralPath $kontentEnv) -and ($envFile -like '*kit20-oauth.env*')
if ($useKontentSsh) { $pk = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD'; if ($pk) { $pw = $pk } }
if (-not $pw) { $pw = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD' }
if (-not $pw) { throw 'SERVER_LV_SSH_PASSWORD' }

$hostLv = Get-EnvValue $envFile 'SERVER_LV_HOST'
if (-not $hostLv) { $hostLv = '194.113.209.152' }
$appDir = Get-EnvValue $envFile 'KIT20_APP_DIR'
if (-not $appDir) { $appDir = '/var/www/kit20' }

$hk = 'ssh-ed25519 SHA256:HuSaSJtaQi7uJItHO0/A10c9e61lnnP4LuQXTrn/X1k'
$plink = 'C:\Program Files\PuTTY\plink.exe'

$remote = "set -e; cd $appDir; test -f storage/birthday-dial-labels.json.bak; if test -f scripts/restore-birthday-dial-from-bak.mjs; then node scripts/restore-birthday-dial-from-bak.mjs; else cp storage/birthday-dial-labels.json.bak storage/birthday-dial-labels.json; fi; chown www-data:www-data storage/birthday-dial-labels.json; systemctl restart kit20; systemctl is-active kit20"

& $plink -ssh "root@$hostLv" -pw $pw -batch -hostkey $hk $remote
if ($LASTEXITCODE -ne 0) { throw "plink failed: $LASTEXITCODE" }
Write-Host "OK: birthday dial layout restored on $hostLv"
