# 仅在本机管理 New API 时加载；Windows DPAPI 密文只能由保存它的 Windows 用户解密。
# 点调用此脚本后，在同一 PowerShell 进程中使用环境变量，不输出管理员凭证。
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$settings = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'environment.json') -Raw | ConvertFrom-Json
$credentialPath = Join-Path $repoRoot $settings.credentialFile
if (-not (Test-Path -LiteralPath $credentialPath -PathType Leaf)) {
    throw '缺少本机 New API 凭证；请由用户提供或从已授权的任务取回，不猜测、不输出密钥。'
}
$credential = Import-Clixml -LiteralPath $credentialPath
if ($credential -isnot [System.Management.Automation.PSCredential]) {
    throw '本机凭证文件类型错误，必须是 Windows DPAPI 加密的 PSCredential。'
}
$env:NEWAPI_BASE_URL = $settings.baseUrl
$env:NEWAPI_USER_ID = $settings.adminUserId
$env:NEWAPI_ADMIN_TOKEN = $credential.GetNetworkCredential().Password
