# 只读核对身份、服务版本和已安装插件；不创建渠道、改价或生成付费任务。
# 按字段选择输出，管理接口返回的源码、用户资料和密钥不会写入核对记录。
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'load-session.ps1')
$headers = @{ Authorization = "Bearer $env:NEWAPI_ADMIN_TOKEN"; 'New-Api-User' = $env:NEWAPI_USER_ID }
$self = Invoke-RestMethod -Method Get -Uri "$env:NEWAPI_BASE_URL/api/user/self" -Headers $headers -TimeoutSec 30
if (-not $self.success) { throw 'New API 管理凭证核对失败，未读取或修改其他配置。' }
if ([string]$self.data.id -ne $env:NEWAPI_USER_ID) { throw 'New API 用户 ID 与本机管理配置不一致。' }
$status = Invoke-RestMethod -Method Get -Uri "$env:NEWAPI_BASE_URL/api/status" -TimeoutSec 30
if (-not $status.success) { throw 'New API 状态接口核对失败。' }
$plugins = Invoke-RestMethod -Method Get -Uri "$env:NEWAPI_BASE_URL/api/plugin/task" -Headers $headers -TimeoutSec 30
if (-not $plugins.success) { throw 'New API 插件清单核对失败。' }
$repoRoot = Split-Path -Parent $PSScriptRoot
# 项目记录明确插件归属；新增源工程后不需要在共用脚本手抄插件路径。
$localPlugins = @(Get-ChildItem -Path (Join-Path $repoRoot 'projects/*/source.json') -File | ForEach-Object {
    $project = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
    foreach ($capability in $project.capabilities) {
        if ($capability.pluginKey) {
            [pscustomobject]@{
                key = $capability.pluginKey
                path = Join-Path $repoRoot "$($capability.integrationDirectory)/plugin.js"
                sourceId = $project.sourceId
            }
        }
    }
})
$record = [ordered]@{
    checkedAt = [DateTime]::UtcNow.ToString('o')
    baseUrl = $env:NEWAPI_BASE_URL
    adminUserId = [string]$self.data.id
    role = $self.data.role
    version = $status.data.version
    plugins = @($plugins.data | ForEach-Object {
        $entry = [ordered]@{
            key = $_.meta.key
            enabled = $_.enabled
            active = $_.active
            version = $_.meta.version
            sourceLayer = $_.source
            sourceHash = $_.source_hash
        }
        # source 是来源层名称，源码一致性必须用服务端 source_hash 与本机文件哈希核对。
        $local = @($localPlugins | Where-Object key -eq $_.meta.key)
        if ($local.Count -gt 1) { throw "插件 $($_.meta.key) 有多个维护源码位置，先修正项目归属。" }
        if ($local.Count -eq 1) {
            $localHash = (Get-FileHash -LiteralPath $local[0].path -Algorithm SHA256).Hash.ToLowerInvariant()
            $entry.sourceId = $local[0].sourceId
            $entry.localSourceHash = $localHash
            $entry.sourceHashMatchesLocal = $localHash -eq $_.source_hash
        }
        $entry
    })
}
$output = Join-Path (Split-Path -Parent $PSScriptRoot) '.local/newapi/inspection.json'
$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $output -Encoding utf8
# 显示非敏感的核对结论；插件明细保留在被忽略的本机记录中。
[ordered]@{ credentialVerified = $true; version = $record.version; pluginCount = $record.plugins.Count; recordPath = $output } | ConvertTo-Json
