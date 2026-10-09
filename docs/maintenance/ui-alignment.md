# APIMart 页面设计对照与维护规则

参考：https://docs.apimart.ai/cn （Mintlify）。本站继续采用 VitePress + Vue + Cloudflare Pages，将适用的导航和操作体验统一实现。

| 区域 | 本站规则 | 验收方式 |
| --- | --- | --- |
| 模型导航 | 能力系列 → 产品分组 → 调用名称 → 适用接口；图片/视频模型和分组都有线性图标 | 两种语言、当前模型展开、其他模型折叠 |
| 视频分组 | Video Studio，覆盖四个已公开 cogvideo 别名；不据别名推断供应商 | 登记精确覆盖校验、公开指南说明 |
| 图片分组 | Gemini / Banana、GPT Image、自有模型独立 | Sidebar 与模型中心一致 |
| 页面操作 | 分体复制按钮、下拉菜单；复制 Markdown/URL、查看 Markdown、下载 OpenAPI | 点击反馈、剪贴板内容、下载源规范 |
| AI 阅读 | 复制包含本页公开 Markdown 地址的提示词、llms.txt 索引 | 不包含调试表单或客户 Key |
| MCP | /mcp，搜索/读取客户公开文档；Cursor 和 VS Code 官方安装链接 | 官方 SDK initialize/list/search/read；私有路径与非文档操作拒绝 |
| 接口操作 | 方法徽标、路径、复制完整接口地址、试一试 | 规范服务器地址与路径一致；沿用本站 /api-proxy |
| 代码示例 | 语言标签、统一复制图标、高亮、焦点；方向键/Home/End | 模式切换请求响应配对；代码原文可复制 |
| 公共样式 | 线性 SVG、浅色选中背景、细边框、圆角、hover/focus、控制台主按钮 | 桌面与390px、深浅主题；长模型名换行 |
| 后续能力 | sources.json 登记 category/modelGroups，生成器使用统一组件 | 新能力无需复制导航/图标/菜单逻辑 |

图标在 site/.vitepress/theme/icons.mjs 维护；客户调用事实仍在源工程公开契约，不在视觉组件里修改。

## MCP 接入

正式地址：https://xyapi-docs.pages.dev/mcp

Streamable HTTP，无会话存储，支持协议版本 2025-06-18 与 2025-03-26；客户端新版本请求协商到本服务支持版本。GET 返回405，因为不提供服务端主动消息流。

工具 search_docs 接受 query 与可选 locale（zh/en）；read_document 接受搜索结果的精确 /markdown/... 路径。资源列表与读取也只覆盖构建时生成的客户页面。跨来源浏览器请求拒绝，桌面 MCP 客户端可直接连接，无需 API Key。

复制 MCP 地址后可手动配置：

```json
{ "mcpServers": { "xyapi-docs": { "url": "https://xyapi-docs.pages.dev/mcp" } } }
```

菜单提供 Cursor 与 VS Code 安装链接，用户自行点击确认安装。MCP 不提供生成或计费工具，不读取源码、维护 SOP 或客户凭证。

依据：[MCP 传输](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)、[Cursor 安装链接](https://cursor.com/docs/context/mcp/install-links)、[VS Code MCP 集成](https://code.visualstudio.com/api/extension-guides/mcp)。
