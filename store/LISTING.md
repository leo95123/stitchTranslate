# Chrome / Edge 商店上架文案

隐私政策公网地址（GitHub Pages）：

https://leo95123.github.io/stitchTranslate/privacy-policy.html

把该 URL 填到 Chrome / Edge 商店「隐私政策」字段。源文件在 `docs/privacy-policy.html`。

---

## 打包命令

```bash
npm run build
npm run pack
```

生成 `release/stitch-translate-<version>.zip`，上传 Chrome / Edge 开发者后台。

---

## 中文商店文案

### 简短说明（≤132 字，对应 manifest description 可同步）

多引擎对照翻译：Google、Bing 与自定义 AI。选中网页文本即可翻译，支持提示词与多模型并行结果。

### 详细描述

Stitch Translate 翻译缝合怪 —— 把多种翻译引擎「缝」在一起对照查看。

【主要功能】
• Popup 快速翻译：输入文本，一键查看多引擎结果  
• 网页划词：选中文本出现扩展图标，点击查看译文  
• 右键菜单翻译：可指定语言与临时提示词  
• 多引擎并行：Google 翻译、微软翻译，以及任意 OpenAI 兼容 AI 模型  
• 自定义 AI：显示名称、模型 ID、API Key、完整接口地址、Headers、提示词变量  
• 引擎顺序拖拽与启用/禁用  
• 配置导出 / 导入，界面中英文切换  

【隐私】
• 不上传数据到开发者服务器  
• API Key 与配置仅保存在本地浏览器  
• 译文请求仅发送到你启用的翻译服务或你填写的 AI 接口  

【适合谁】
需要对照多个引擎译文、或使用自建 / 第三方 AI 接口的用户。

### 分类建议
Productivity（效率工具） / Tools

### 权限说明（审核表单可参考）

• storage：保存用户配置与 API Key（仅本地）  
• activeTab + 内容脚本：在用户浏览的页面显示划词翻译入口  
• contextMenus：右键翻译  
• host（Google/Bing/OpenAI）：调用对应翻译服务  
• optional host：用户配置的自定义 AI 域名，使用时再授权  

---

## English store listing

### Short description

Multi-engine translator: Google, Bing, and custom AI models. Select text on any page to translate with side-by-side results.

### Detailed description

Stitch Translate stitches multiple engines together so you can compare translations at a glance.

Features:
• Popup translator with multi-engine results  
• Selection FAB on web pages  
• Context-menu translate with language & temporary prompt  
• Google Translate, Microsoft Translator, and OpenAI-compatible AI models  
• Custom AI profiles: name, model, API key, endpoint, headers, prompt variables  
• Drag-and-drop engine order, enable/disable  
• Import/export settings; Chinese/English UI  

Privacy:
• No developer backend; we don’t collect your texts or keys  
• API keys stay in local extension storage  
• Requests go only to engines you enable or endpoints you configure  

### Category
Productivity

### Single purpose (Privacy tab)

Provide multi-engine text translation (Google, Bing, and user-configured AI) via popup, selection overlay, and context menu.

---

## 审核常见问答（可复制）

**Q: 为什么需要访问网页？**  
A: 仅用于在页面上显示划词按钮与翻译面板；不会读取未选中内容，也不会注入广告。

**Q: 为什么需要可选的全部 https/http 权限？**  
A: 用户可配置任意 OpenAI 兼容接口域名；默认不授予，仅在保存/测试/翻译时按域名申请。

**Q: 是否出售用户数据？**  
A: 否。本扩展无开发者服务器，不收集、不出售用户数据。
