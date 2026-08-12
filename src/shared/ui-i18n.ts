export type UiLang = 'zh' | 'en';

export const UI_LANG_OPTIONS: Array<{ code: UiLang; label: string }> = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

type MessageDict = Record<string, string>;

const zh: MessageDict = {
  'nav.engines': '引擎顺序',
  'nav.ai': 'AI 模型',
  'nav.language': '界面语言',
  'nav.advanced': '高级设置',
  'nav.export': '导出 / 导入',
  'options.title': '扩展配置',
  'options.subtitle': '管理翻译引擎、API Key 与高级偏好。',
  'options.uiLang': '界面语言',
  'options.uiLang.hint': '切换扩展界面显示语言。',
  'ai.title': 'AI 模型',
  'ai.subtitle': '可添加多个模型，并在引擎顺序中启用。',
  'ai.add': '添加模型',
  'ai.name': '显示名称',
  'ai.prompt': '提示词',
  'ai.prompt.hint':
    '可用变量：{{source}}=源语言名，{{target}}=目标语言名，{{text}}=待翻译原文。未写 {{text}} 时会自动把原文附在提示词后面。',
  'ai.model': '模型 ID',
  'ai.key': 'API Key',
  'ai.endpoint': '接口地址',
  'ai.endpoint.hint':
    '完整请求地址，需包含 chat/completions，例如 https://api.openai.com/v1/chat/completions',
  'ai.endpoint.placeholder': 'https://api.openai.com/v1/chat/completions',
  'ai.headers': 'Headers (JSON)',
  'ai.headers.hint': '可选，JSON 对象。Authorization 会自动附加 API Key。',
  'ai.delete': '删除',
  'ai.test': '测试接口',
  'ai.testing': '测试中...',
  'ai.test.ok': '测试成功',
  'ai.test.fail': '测试失败',
  'ai.empty': '暂无 AI 模型，点击上方添加。',
  'advanced.title': '高级设置',
  'advanced.autoDetect': '自动检测源语言',
  'advanced.autoDetect.hint': '自动识别选中文本的语言。',
  'advanced.showFab': '显示浮动翻译按钮',
  'advanced.showFab.hint': '选中文本时显示快速翻译按钮。',
  'engine.title': '引擎顺序',
  'engine.hint': '拖拽调整优先级，点击眼睛切换启用。',
  'engine.enable': '启用',
  'engine.disable': '禁用',
  'engine.gotoAi': '配置 AI 模型',
  'export.title': '导出 / 导入',
  'export.hint': '备份或恢复配置 JSON。',
  'export.btn': '导出配置',
  'import.btn': '导入配置',
  'save.btn': '保存更改',
  'save.ok': '已保存',
  'save.fail': '保存失败',
  'import.ok': '已导入，请点击保存更改',
  'import.fail': '导入失败',
  'popup.placeholder': '输入要翻译的文本...',
  'popup.clear': '清除',
  'popup.settings': '设置',
  'popup.sourceLang': '源语言',
  'popup.targetLang': '目标语言',
  'popup.swap': '交换语言',
  'popup.copy': '复制',
  'popup.translating': '翻译中...',
  'popup.translate': '翻译',
  'popup.prompt': '临时提示词',
  'popup.prompt.hint': '仅本次翻译生效，不保存到设置。留空则使用各 AI 模型自己的提示词。',
  'popup.prompt.toggle': '编辑提示词',
  'panel.close': '关闭',
  'panel.translating': '翻译中...',
  'panel.copy': '复制',
  'panel.copied': '已复制',
  'panel.empty': '无翻译结果',
  'engine.google': 'Google 翻译',
  'engine.bing': '微软翻译',
};

const en: MessageDict = {
  'nav.engines': 'Engine Order',
  'nav.ai': 'AI Models',
  'nav.language': 'Language',
  'nav.advanced': 'Advanced',
  'nav.export': 'Export / Import',
  'options.title': 'Extension Configuration',
  'options.subtitle': 'Manage translation engines, API keys, and preferences.',
  'options.uiLang': 'Interface Language',
  'options.uiLang.hint': 'Switch the extension UI language.',
  'ai.title': 'AI Models',
  'ai.subtitle': 'Add multiple models and enable them in Engine Order.',
  'ai.add': 'Add Model',
  'ai.name': 'Display Name',
  'ai.prompt': 'Prompt',
  'ai.prompt.hint':
    'Variables: {{source}}=source language name, {{target}}=target language name, {{text}}=source text. If {{text}} is omitted, the text is appended after the prompt.',
  'ai.model': 'Model ID',
  'ai.key': 'API Key',
  'ai.endpoint': 'Endpoint URL',
  'ai.endpoint.hint':
    'Full request URL including chat/completions, e.g. https://api.openai.com/v1/chat/completions',
  'ai.endpoint.placeholder': 'https://api.openai.com/v1/chat/completions',
  'ai.headers': 'Headers (JSON)',
  'ai.headers.hint': 'Optional JSON object. Authorization is added from API Key.',
  'ai.delete': 'Delete',
  'ai.test': 'Test API',
  'ai.testing': 'Testing...',
  'ai.test.ok': 'Test succeeded',
  'ai.test.fail': 'Test failed',
  'ai.empty': 'No AI models yet. Click Add Model above.',
  'advanced.title': 'Advanced',
  'advanced.autoDetect': 'Auto-detect source language',
  'advanced.autoDetect.hint': 'Automatically identify the language of selected text.',
  'advanced.showFab': 'Show Floating Action Button',
  'advanced.showFab.hint': 'Display a quick translate button when text is selected.',
  'engine.title': 'Engine Order',
  'engine.hint': 'Drag to reorder. Click the eye to enable or disable.',
  'engine.enable': 'Enable',
  'engine.disable': 'Disable',
  'engine.gotoAi': 'Configure AI Models',
  'export.title': 'Export / Import',
  'export.hint': 'Backup or restore your configuration JSON.',
  'export.btn': 'Export Config',
  'import.btn': 'Import Config',
  'save.btn': 'Save Changes',
  'save.ok': 'Saved',
  'save.fail': 'Save failed',
  'import.ok': 'Imported. Click Save Changes.',
  'import.fail': 'Import failed',
  'popup.placeholder': 'Enter text to translate...',
  'popup.clear': 'Clear',
  'popup.settings': 'Settings',
  'popup.sourceLang': 'Source language',
  'popup.targetLang': 'Target language',
  'popup.swap': 'Swap languages',
  'popup.copy': 'Copy',
  'popup.translating': 'Translating...',
  'popup.translate': 'Translate',
  'popup.prompt': 'Temporary prompt',
  'popup.prompt.hint': 'Applies to this translation only. Leave empty to use each AI model prompt.',
  'popup.prompt.toggle': 'Edit prompt',
  'panel.close': 'Close',
  'panel.translating': 'Translating...',
  'panel.copy': 'Copy',
  'panel.copied': 'Copied',
  'panel.empty': 'No translation results',
  'engine.google': 'Google Translate',
  'engine.bing': 'Microsoft Translator',
};

const DICTS: Record<UiLang, MessageDict> = { zh, en };

export function isUiLang(value: unknown): value is UiLang {
  return value === 'zh' || value === 'en';
}

export function t(lang: UiLang, key: string): string {
  return DICTS[lang][key] ?? DICTS.zh[key] ?? key;
}

export function applyDomI18n(root: ParentNode, lang: UiLang): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(lang, key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key && 'placeholder' in el) {
      (el as HTMLInputElement | HTMLTextAreaElement).placeholder = t(lang, key);
    }
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key) el.title = t(lang, key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const key = el.dataset.i18nAria;
    if (key) el.setAttribute('aria-label', t(lang, key));
  });

  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

export function engineDisplayName(lang: UiLang, id: 'google' | 'bing'): string {
  return t(lang, `engine.${id}`);
}
