# OAuth proxy for Decap on VPS.
# Reads secrets from (in order): $env:KIT20_ENV_FILE, repo\kit20-oauth.env, Desktop\КонтентЗавод\.env
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$localKit20Env = Join-Path $repoRoot 'kit20-oauth.env'

$kontentDirName = -join @(0x041A, 0x043E, 0x043D, 0x0442, 0x0435, 0x043D, 0x0442, 0x0417, 0x0430, 0x0432, 0x043E, 0x0434 | ForEach-Object { [char]$_ })
$kontentEnv = Join-Path $env:USERPROFILE (Join-Path 'Desktop' (Join-Path $kontentDirName '.env'))

$envFile = $null
if ($env:KIT20_ENV_FILE -and (Test-Path -LiteralPath $env:KIT20_ENV_FILE)) {
  $envFile = $env:KIT20_ENV_FILE
}
elseif (Test-Path -LiteralPath $localKit20Env) {
  $envFile = $localKit20Env
}
elseif ($env:KIT20_KONTENT_ENV -and (Test-Path -LiteralPath $env:KIT20_KONTENT_ENV)) {
  $envFile = $env:KIT20_KONTENT_ENV
}
elseif (Test-Path -LiteralPath $kontentEnv) {
  $envFile = $kontentEnv
}

if (-not $envFile) {
  throw @"
No env file found. Do one of:
  - Copy kit20-oauth.env.example to kit20-oauth.env in repo root and fill it, or
  - Set KIT20_ENV_FILE to full path of your .env, or
  - Set KIT20_KONTENT_ENV to full path of KontentZavod\.env
"@
}

function Get-EnvValue([string]$path, [string]$key) {
  $line = Get-Content -LiteralPath $path -Encoding UTF8 | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
  if (-not $line) { return '' }
  ($line -replace "^\s*$key\s*=\s*", '').Trim()
}

$pw = Get-EnvValue $envFile 'SERVER_LV_SSH_PASSWORD'
# Для kit20-oauth.env пароль SSH берём из КонтентЗавод (меньше опечаток при копировании)
$useKontentSsh = (Test-Path -LiteralPath $kontentEnv) -and ($envFile -like '*kit20-oauth.env*')
if ($useKontentSsh) {
  $pwKont = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD'
  if ($pwKont) { $pw = $pwKont }
}
if (-not $pw) { $pw = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD' }
$cid = Get-EnvValue $envFile 'KIT20_GITHUB_OAUTH_CLIENT_ID'
$csec = Get-EnvValue $envFile 'KIT20_GITHUB_OAUTH_CLIENT_SECRET'
if (-not $pw) { throw 'SERVER_LV_SSH_PASSWORD: set in kit20-oauth.env or in KontentZavod .env' }
if (-not $cid -or -not $csec) {
  Write-Host 'Fill KIT20_GITHUB_OAUTH_CLIENT_ID and KIT20_GITHUB_OAUTH_CLIENT_SECRET in kit20-oauth.env (see kit20-oauth.env.example), then run again.'
  exit 1
}

$hk = 'ssh-ed25519 SHA256:HuSaSJtaQi7uJItHO0/A10c9e61lnnP4LuQXTrn/X1k'
$plink = 'C:\Program Files\PuTTY\plink.exe'
$hostLv = (Get-EnvValue $envFile 'SERVER_LV_HOST')
if (-not $hostLv) { $hostLv = '194.113.209.152' }

$cidE = $cid.Replace("'", "'\''")
$csecE = $csec.Replace("'", "'\''")

$remote = @'
set -e
docker rm -f decap-oauth-kit20 2>/dev/null || true
docker pull ramank775/netlify-cms-github-oauth-provider:master
docker run -d --restart=always --name decap-oauth-kit20 \
  -e NODE_ENV=production \
  -e ORIGINS='kit20.ru,www.kit20.ru' \
  -e OAUTH_CLIENT_ID='__CID__' \
  -e OAUTH_CLIENT_SECRET='__CSEC__' \
  -e REDIRECT_URL='https://kit20.ru/callback' \
  -p 127.0.0.1:3111:3000 \
  ramank775/netlify-cms-github-oauth-provider:master
sleep 2
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3111/auth || true
echo
docker ps --filter name=decap-oauth-kit20 --format '{{.Status}}'
'@.Replace('__CID__', $cidE).Replace('__CSEC__', $csecE)

& $plink -ssh "root@$hostLv" -pw $pw -batch -hostkey $hk $remote
if ($LASTEXITCODE -ne 0) { throw "plink failed (exit $LASTEXITCODE). Check SSH password and host." }
Write-Host "Done. Open https://kit20.ru/admin/"
