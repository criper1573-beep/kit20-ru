# Скачать с VPS backup циферблата ДР (после деплоя .bak)
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
else { throw 'Missing kit20-oauth.env or KontentZavod .env' }

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
$hk = 'ssh-ed25519 SHA256:HuSaSJtaQi7uJItHO0/A10c9e61lnnP4LuQXTrn/X1k'
$plink = 'C:\Program Files\PuTTY\plink.exe'
$out = Join-Path $repoRoot 'storage\birthday-dial-labels.server-bak.json'

$remote = 'ls -la /var/www/kit20/storage/birthday-dial-labels.json*; echo MARKER_BAK; cat /var/www/kit20/storage/birthday-dial-labels.json.bak'

$raw = & $plink -ssh "root@$hostLv" -pw $pw -batch -hostkey $hk $remote
if ($LASTEXITCODE -ne 0) { throw "plink failed: $LASTEXITCODE" }
Write-Host $raw

$parts = [string]$raw -split 'MARKER_BAK', 2
if ($parts.Count -lt 2) { throw 'marker not found' }
$body = $parts[1].Trim()
if (-not $body -or $body -notmatch '^\{') { throw 'No .bak JSON on server' }
$body | Set-Content -LiteralPath $out -Encoding UTF8 -NoNewline
Write-Host "Saved: $out"
