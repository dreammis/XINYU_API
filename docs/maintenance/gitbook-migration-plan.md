# GitBook migration and public contract aggregation

用户已选择真正的 GitBook 托管，通过 Git 仓库同步。当前文档仓库为 `dreammis/XINYU_API`，本地目录为 `G:/workspace/xyapi_doc`；原消息中的 `G:/workspace/xyapi/_doc` 不存在。

## 实施范围

1. 读取两个指定会话与现有适配器，按实际客户入口补齐图片和视频契约。
2. 在适配器目录加入 `public-docs.json`、`public-openapi.json` 与英文指南；中文直接引用已有客户指南，避免抄写。
3. 文档仓库登记来源，导入明确列出的公开文件，保存内容哈希和源码版本。默认构建只读已导入快照，不依赖其他工程或网络。
4. 由公共 Markdown 和 OpenAPI 生成中英文 GitBook 页面、目录和参数说明。所有模型名、接口与默认值来自已登记契约；不发布运维报告。
5. 添加校验、GitHub Actions 和源工程更新通知模板。源工程发布后通知文档仓库，仓库重新导入并提交生成结果，GitBook Git Sync 跟进。
6. 不在公共文档说明内部供应商、渠道编号或部署过程。当前工程中的未提交前端调整不属于本次迁移。

## 验收

- 本地导入、构建及校验通过，连续构建无差异。
- OpenAPI 通过标准校验；示例通过现有插件的真实参数校验；错误文档及 SSE 契约与当前入口源码一致。
- 汇总测试覆盖删除能力、缺失来源、路径冲突与源文件哈希漂移，失败应显式报错。
- GitBook 连接、Git Sync 和域名配置以实际账户授权后的结果为准；不能把本地准备完成报告成已经上线。

## 来源证据

- `规划 GPT-6 与生图渠道迁移`：`01a0fd20-2fde-7af2-9849-8d296aea84f3`。
- `调研视频模型接入 New API`：`01a0ff08-4edc-7ef3-94b7-f595aa972c54`。
- 当前 `integrations/newapi/media-image/README.md` 和 stream-proxy 源码已包含 20 请求容量、`delivery:url` 与实际像素说明，优先于旧会话中的 2 并发配置。
- 视频当前公开模型为 `cogvideo-*`，`GET /v1/videos/{id}` 只返回状态，文件通过 `/content` 下载。
- GitBook 官方 Git Sync 内容配置：<https://gitbook.com/docs/docs-as-code/git-sync/content-configuration>。
- GitBook 官方 OpenAPI：<https://gitbook.com/docs/create-content/openapi>。

## 完成记录（2026-10-06）

- 已新增两个源工程公开导出清单、两份 OpenAPI、两份英文指南；中文直接引用现有客户文档。
- 已生成 46 个中英文 GitBook 文件，覆盖 14 个图片/视频公开调用名称、图片生成/编辑和视频任务/内容/Responses 流程；保留旧 ElevenLabs TTS 文档并标明待验证的网关响应差异。
- 本地导入、构建和差异校验通过；SwaggerParser 12.1.0 标准校验两份 OpenAPI 通过。
- 7 项汇总回归测试通过，含普通功能无需 model、固定源码 SHA 读取和部分来源失败时不覆盖快照。
- 源工程 6 项公开契约测试通过，模型/版本与实际插件一致，4 个公开请求示例均被真实协议解码器接受。
- GitBook 官方 `gitbook-docs.yaml` JSON Schema 验证通过，4 份 Actions YAML 解析通过；14 个不支持的请求示例被公开 JSON Schema 拒绝。
- 未调用真实生成接口，没有为本轮文档验证产生付费任务。
- GitBook 插件已连接，XY API Basic 网站与中英文空间已创建。实际云端导入、发布和 Git Sync 的状态见 gitbook-setup.md；GitHub Secrets 尚未设置。浏览器尚未登录，插件授权不能代替原生 Git Sync 的 GitHub App 账户绑定。
- 网站已从 master 导入并公开发布，中英文首页和全部 8 个接口参考页核验通过；OpenAPI 鉴权、类型与示例已渲染。文档发布基于独立工作区，未推送原有未发布的前端历史。
