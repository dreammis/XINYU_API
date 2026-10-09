# 系列导航与模型中心交付约定

文档站使用同一份公开规范和指南生成系列、接口页、模型中心与模型详情。客户目录按能力组织，渠道和工程作为内部来源记录。

## 公开清单

`schemaVersion: 1` 继续兼容旧清单。新增展示字段如下：

```json
{
  "category": "image",
  "models": ["gpt-image-2"],
  "modelDetails": {
    "gpt-image-2": {
      "group": "gpt-image",
      "title": { "zh": "GPT Image 2", "en": "GPT Image 2" },
      "summary": { "zh": "填写已验收的用途与差异。", "en": "Describe verified uses and differences." },
      "operations": ["generateImage", "editImage"]
    }
  }
}
```

类别为 `image`、`video`、`tts`、`music`、`text`、`transcription`、`tool`、`other`。`models` 是公开名称唯一列表，`modelDetails` 不增加模型，名称必须已存在，操作 ID 必须存在于同一规范。`title`、`summary` 提供时必须同时有中英文。非模型能力使用 `models: []`。

组名、标题和用途来自客户接入任务，不由文档工程从名称推断。操作入口还需要请求 schema 的 model 枚举确实包含相应名称。查询、下载等共享流程通过系列页和指南说明。

旧清单没有类别时，可以在 `sources.json` 登记分类；清单与登记同时声明时必须一致。未分类的旧能力明确进入其他能力。后续正式交付优先在源清单携带类别。

## 选型信息不抄两份

模型差异、实际限制和计费语义在源公开指南中维护。文档工程登记要摘录的二级标题：

```json
{
  "id": "media-video",
  "category": "video",
  "selectionSections": {
    "zh": ["模型与价格"],
    "en": ["Model capabilities"]
  }
}
```

系列页直接引用这些章节。源工程改标题时同时更新登记；缺失章节明确失败。未提供章节时仍有真实操作和模型入口，不生成猜测的对照表。

## 页面与维护位置

- `content/series.json`：稳定分类名称、图标和介绍。
- `content/zh`、`content/en`：共用接入指南、快速开始、鉴权、计费与 FAQ。
- `scripts/build-site.mjs`：从快照生成系列导航、选型章节和模型详情 URL。
- `site/.vitepress/theme`：首页、模型列表、接口页、代码示例和请求客户端。
- `content/openapi-zh.json`：既有规范缺失中文说明的逐条展示翻译，严格对应原文。源 `x-description-zh` 优先；下载规范保持原样。新公开契约应完整交付中文，不依赖此旧内容翻译表。

现有模型详情只展示已确认的信息和调用入口；没有交付结构化差异时链接到源指南选型章节。不要给模型生成未经确认的原厂、速度排名、精确尺寸或价格。

## 验收

构建、文档校验和测试通过。检查系列导航、所有模型入口、中英文、搜索、移动端、JSON/multipart 参数、条件约束、SSE 与文件响应。调试客户端只用内存工作区和本站代理；生成会正常计费。发布时保留旧 URL，只发布文档资产。
