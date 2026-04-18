<#!
  Поднимает на VPS (SERVER_LV_*) контейнер OAuth для Decap CMS + проверяет nginx /auth и /callback.
  Берёт секреты из Desktop\КонтентЗавод\.env: KIT20_GITHUB_OAUTH_CLIENT_ID, KIT20_GITHUB_OAUTH_CLIENT_SECRET.
#>
$ErrorActionPreference = 'Stop'
$kontentEnv = Join-Path ([Environment]::GetFolderPath('Desktop')) 'КонтентЗавод\.env'
if (-not (Test-Path $kontentEnv)) { throw "Не найден файл: $kontentEnv" }

function Get-EnvValue([string]$path, [string]$key) {
  $line = Get-Content $path -Encoding UTF8 | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
  if (-not $line) { return '' }
  ($line -replace "^\s*$key\s*=\s*", '').Trim()
}

$pw = Get-EnvValue $kontentEnv 'SERVER_LV_SSH_PASSWORD'
$cid = Get-EnvValue $kontentEnv 'KIT20_GITHUB_OAUTH_CLIENT_ID'
$csec = Get-EnvValue $kontentEnv 'KIT20_GITHUB_OAUTH_CLIENT_SECRET'
if (-not $pw) { throw 'В .env нет SERVER_LV_SSH_PASSWORD' }
if (-not $cid -or -not $csec) {
  Write-Host 'Заполните в КонтентЗавод\.env: KIT20_GITHUB_OAUTH_CLIENT_ID и KIT20_GITHUB_OAUTH_CLIENT_SECRET (из GitHub OAuth App), затем запустите скрипт снова.'
  exit 1
}

$hk = 'ssh-ed25519 SHA256:HuSaSJtaQi7uJItHO0/A10c9e61lnnP4LuQXTrn/X1k'
$plink = 'C:\Program Files\PuTTY\plink.exe'
$hostLv = (Get-EnvValue $kontentEnv 'SERVER_LV_HOST')
if (-not $hostLv) { $hostLv = '194.113.209.152' }

$cidE = $cid.Replace("'", "'\''")
$csecE = $csec.Replace("'", "'\''")

$remote = @"
set -e
docker rm -f decap-oauth-kit20 2>/dev/null || true
docker pull ramank775/netlify-cms-github-oauth-provider:master
docker run -d --restart=always --name decap-oauth-kit20 \
  -e NODE_ENV=production \
  -e ORIGINS='kit20.ru,www.kit20.ru' \
  -e OAUTH_CLIENT_ID='$cidE' \
  -e OAUTH_CLIENT_SECRET='$csecE' \
  -e REDIRECT_URL='https://kit20.ru/callback' \
  -p 127.0.0.1:3111:3000 \
  ramank775/netlify-cms-github-oauth-provider:master
sleep 2
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3111/auth || true
echo
docker ps --filter name=decap-oauth-kit20 --format '{{.Status}}'
"@

& $plink -ssh "root@$hostLv" -pw $pw -batch -hostkey $hk $remote
Write-Host 'Готово. Проверьте https://kit20.ru/admin/ → Login with GitHub.'
