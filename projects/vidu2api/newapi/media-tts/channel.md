# Vox 1 内部接入配置

公开模型 `vox-1`（Vox 1），能力/插件 `media-tts`。真实上游是 A 的 Vidu TTS，不公开源音色 ID、来源地址、标签或错误；不宣称自主训练。B 为 New API v1.0.0-rc.41，A base URL https://vidu2api.cgssoccer.com。

使用 type61 独立渠道；native POST /tts/v1/tasks、GET /tts/v1/tasks/:task_id。A 的 /internal/tts/tasks JSON 创建/查询和 /content 文件接口都需渠道 Bearer 鉴权。B 泛型产物接口提供客户文件鉴权、分享地址与代理，不向客户直出 A 地址。首期只支持 MP3。

定价由用户授权选择：按成功生成次数，每次约人民币 0.10 元，默认分组倍率 1。实例 USDExchangeRate=7.3、QuotaPerUnit=500000、显示 USD，对应 ModelPrice[vox-1]=0.01369863。extractUsage 返回 null；失败退款需真实账单验收。参考阿里云模型广场语音模型 0.8 元/万字符和豆包 Coze 系统音色 0.0003 元/字符，作为普通质量定位参考，不称为行业统计均价。短文本单次价并非总是比按字数方案便宜。

当前官方前端允许 5000 加权字符单位，U+4E00–U+9FFF 计 2，其余 Unicode 字符计 1。预检 GET 全文中文 2500 字返回 414，POST credits 返回 404；真实只读对照：英文100/101单位分别1/2积分，中文100/101字分别2/3积分，英文200/202单位分别2/3积分，5000英文单位报价50积分。因此 A 异步 TTS 预检使用等价 ASCII 长度，只改变费用测量文本，submit 仍发原文。测试边界和参数需跟上游更新同步。

语速0.5–2、音调整数±12、音量整数0–10；情绪七值 happy/sad/angry/fearful/disgusted/surprised/neutral。全文情绪通过 prompts[].audio.emotion，增强 through input.enhance。首期不解析文本内情绪标签；按全文加权长度校验。

音色导入脚本 import-voices.py 将内部 JSON 映射为中性 vx_ ID，public-assets 只放明确公开的目录和 MP3。353 音色、24 语言、345 可下载样本，8 个源样本403/404为 null，不借用其他声音。来源原文、不可用资源和预检探测证据存 C 的 ignored .local/projects/vidu2api/；上线实账和部署版本写 releases/media-tts。

未来接入不同渠道时，独立能力使用独立模型；只有声音目录、字段语义、范围、格式和限制真正一致的渠道，才共享同一个调用名。不为未来渠道预造适配层。管理员凭证只从 newapi/load-session.ps1 加载；使用服务端渠道复制保留上游密钥，只合并本次模型价格和元数据。
