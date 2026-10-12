# C 的共用 New API 环境与参考资料

此目录保存共用环境、凭证加载、只读检查和当前版本官方参考。**各源工程的插件和客户文档在 projects/<源工程ID>/newapi/<能力ID>/，不在本目录混放。**

A 的作者从 [接入规范](../docs/integration/README.md) 开始；C 的维护者从 [项目索引](../projects/README.md) 找资料。本次项目为 [vidu2api](../projects/vidu2api/README.md)。

## 当前已核对环境（2026-10-10）

信息来自用户授权的 [历史视频接入会话](codex://threads/01a0ff08-4edc-7ef3-94b7-f595aa972c54)，再通过管理 API 只读核对：

| 项目 | 实际结果 |
| --- | --- |
| 客户/管理服务地址 | https://openai.2yanx.dpdns.org |
| New API 版本 | v1.0.0-rc.41 |
| 管理用户 ID | 1，凭证已验证与该 ID一致 |
| 已安装任务插件 | 12 个 |
| 图片插件 | media-image 1.2.0，enabled/active 均 true |
| 视频插件 | media-video 1.0.0，enabled/active 均 true |
| C/线上源码 | 两插件 SHA256 与 B source_hash 一致；新路径复核见项目迁移记录 |

上述检查不代替生成/退款验收。本次未上传插件、改渠道、改价格或发付费请求。

## 使用凭证与检查

- environment.json 只有地址、用户 ID与本机凭证位置，无 Token值。
- .local/newapi/admin.credential.xml 是 Windows DPAPI 加密 PSCredential，Git 忽略，仅保存它的 Windows 用户在对应机器可解密。
- PowerShell 点调用 load-session.ps1 后，在同一进程用 NEWAPI_BASE_URL、NEWAPI_USER_ID、NEWAPI_ADMIN_TOKEN，不打印变量。
- inspect.ps1 只读核对身份、版本、插件列表，并按项目 source.json 的插件映射比较本机源码哈希；筛选结果存 .local/newapi/inspection.json。
- 管理与客户/上游凭证分开；客户和上游秘密/原始证据存本机 .local/projects/<源工程ID>/ 或对应已配置运行秘密，不写进 Git、公开文件或 Pages。
- 密文不会自动分发到其他电脑；其他环境配置自己的秘密，不把本机 XML当跨设备凭证。

```powershell
# 在 C 根目录执行
./newapi/inspect.ps1
. ./newapi/load-session.ps1
```

## 官方版本参考，不靠猜接口

[reference/v1.0.0-rc.41](reference/v1.0.0-rc.41/README.md) 保存官方插件说明、v1.d.ts 与 v1.schema.json，来源为 QuantumNous/new-api 的对应 tag 固定提交，附许可证和 SHA256。B 升级时重新核对版本及源码差异，不拿最新分支文档替代线上版本。

插件列表中的 source 是来源层名称，代码一致性用 source_hash。管理写接口、渠道字段/计费和源码研究入口见 [research-newapi.md](../docs/integration/research-newapi.md)、[channel-config.md](../docs/integration/channel-config.md)。

现有图片/视频渠道 ID、配套入口/资产服务和历史操作工具都属于 vidu2api，说明放该项目的 channel.md/research；不把固定价格/地址的旧工具作为其他源工程通用框架。
