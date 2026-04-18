# OAuth proxy for Decap on VPS. Secrets: Desktop\КонтентЗавод\.env KIT20_GITHUB_OAUTH_*
# Path built with char codes so the script runs under Windows PowerShell 5.1 without UTF-8 BOM issues.
$ErrorActionPreference = 'Stop'
$kontentDirName = -join @(0x041A, 0x043E, 0x043D, 0x0442, 0x0435, 0x043D, 0x0442, 0x0417, 0x0430, 0x0432, 0x043E, 0x0434 | ForEach-Object { [char]$_ })
$kontentEnv = Join-Path $env:USERPROFILE (Join-Path 'Desktop' (Join-Path $kontentDirName '.env'))
if ($env:KIT20_KONTENT_ENV) { $kontentEnv = $env:KIT20_KONTENT_ENV }
if (-not (Test-Path -LiteralPath $kontentEnv)) {
  throw "Missing env file: $kontentEnv (set KIT20_KONTENT_ENV to full path if Desktop folder moved)"
}

function Get-EnvValue([string]$path, [string]$key) {
  $line = Get-Content -LiteralPath $path -Encoding UTF8 | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
  if (-not $line) { return '' }
  ($line -replace "^\s*$key\s*=\s*", '').Trim()
}

$pw = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD'
$cid = Get-EnvValue $kontentEnv 'KIT20_GITHUB_OAUTH_CLIENT_ID'
$csec = Get-EnvValue $kontentEnv 'KIT20_GITHUB_OAUTH_CLIENT_SECRET'
if (-not $pw) { throw 'SERVER_LV_SSH_PASSWORD missing in .env' }
if (-not $cid -or -not $csec) {
  Write-Host 'Add KIT20_GITHUB_OAUTH_CLIENT_ID and KIT20_GITHUB_OAUTH_CLIENT_SECRET to KontentZavod .env, then run again.'
  exit 1
}

$hk = 'ssh-ed25519 SHA256:HuSaSJtaQi7uJItHO0/A10c9e61lnnP4LuQXTrn/X1k'
$plink = 'C:\Program Files\PuTTY\plink.exe'
$hostLv = (Get-EnvValue $kontentEnv 'SERVER_LV_HOST')
if (-not $hostLv) { $hostLv = '194.113.209.152' }

$cidE = $cid.Replace("'", "'\''")
$csecE = $csec.Replace("'", "'\''")

# Single-quoted here-string so PowerShell 5 does not parse bash '||'
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
Write-Host 'Done. Open https://kit20.ru/admin/ and use Login with GitHub.'
