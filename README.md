# Stitch Translate

多引擎浏览器翻译扩展（Chrome / Edge，Manifest V3）。

支持 **Google 翻译**、**Bing 翻译** 与 **自定义 AI 模型**（OpenAI 兼容接口），可按配置顺序并行展示多个结果。

## 功能

1. **Popup**：点击扩展图标，输入文本翻译，按引擎顺序展示多结果卡片  
2. **选中浮标**：网页选中文本后出现浮动按钮，点击弹出翻译面板  
3. **选项页**：AI 模型配置、引擎顺序拖拽、配置导出/导入  

## 开发

```bash
npm install
npm run build
```

开发时可用：

```bash
npm run dev
```

## 加载扩展

1. 运行 `npm run build`，产物在 `dist/`  
2. 打开 Chrome/Edge → `chrome://extensions`（或 `edge://extensions`）  
3. 开启「开发者模式」  
4. 「加载已解压的扩展程序」→ 选择本项目的 `dist` 目录  

## AI 配置

在扩展「选项」页填写：

- **Model**：如 `gpt-4o`、`deepseek-chat` 等  
- **API Key**  
- **Endpoint**：OpenAI 兼容地址，默认 `https://api.openai.com/v1`  

Google / Bing 无需 Key。

## 配置导出

选项页可导出/导入 JSON，便于备份与迁移。
