# Обновить сайт на VPS (как в README: pull, build, chown, restart).
# Секреты: SERVER_LV_SSH_PASSWORD и SERVER_LV_HOST в kit20-oauth.env или KIT20_KONTENT_ENV.
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
if (-not $envFile) { throw "Нет env: kit20-oauth.env в корне репо или KIT20_ENV_FILE" }

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
if (-not (Test-Path -LiteralPath $plink)) { throw "Нужен PuTTY plink: $plink" }

$remote = @"
set -e
cd $appDir
git pull
npm ci
npm run build
npm run verify:obshchak
sudo chown -R www-data:www-data $appDir/src/content $appDir/storage
sudo systemctl restart kit20
systemctl is-active kit20
"@

& $plink -ssh "root@$hostLv" -pw $pw -batch -hostkey $hk $remote
if ($LASTEXITCODE -ne 0) { throw "plink failed: $LASTEXITCODE" }
Write-Host "OK: $hostLv $appDir обновлён, kit20 перезапущен."
