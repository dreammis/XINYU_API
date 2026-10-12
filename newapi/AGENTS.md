# New API 共用环境与参考目录

- 本目录保存共用环境、管理凭证加载与官方版本参考；各 A 的插件/适配器/客户契约放 projects/<源工程ID>/newapi/<能力ID>/。
- 技术规范入口是 docs/integration/README.md；项目身份、插件 key映射在各项目 source.json。使用当前 B 版本的官方契约，不猜字段/权限。
- environment.json 不含密钥；本机管理密文在 .local/newapi，加载后不输出环境变量/完整管理响应。
- inspect.ps1 只读、不付费；source 是来源层标签，哈希核对用 source_hash。
- 修改共用配置保留其他项目条目；参考资料升级记录 tag/commit/hash，不改写旧版文件冒充新版本。
