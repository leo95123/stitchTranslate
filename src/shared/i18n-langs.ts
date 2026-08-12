export interface LangOption {
  code: string;
  nameZh: string;
  nameEn: string;
}

export const LANGUAGES: LangOption[] = [
  { code: 'auto', nameZh: '自动检测', nameEn: 'Auto Detect' },
  { code: 'zh-CN', nameZh: '简体中文', nameEn: 'Chinese (Simplified)' },
  { code: 'zh-TW', nameZh: '繁体中文', nameEn: 'Chinese (Traditional)' },
  { code: 'en', nameZh: '英语', nameEn: 'English' },
  { code: 'ja', nameZh: '日语', nameEn: 'Japanese' },
  { code: 'ko', nameZh: '韩语', nameEn: 'Korean' },
  { code: 'fr', nameZh: '法语', nameEn: 'French' },
  { code: 'de', nameZh: '德语', nameEn: 'German' },
  { code: 'es', nameZh: '西班牙语', nameEn: 'Spanish' },
  { code: 'pt', nameZh: '葡萄牙语', nameEn: 'Portuguese' },
  { code: 'ru', nameZh: '俄语', nameEn: 'Russian' },
  { code: 'it', nameZh: '意大利语', nameEn: 'Italian' },
  { code: 'ar', nameZh: '阿拉伯语', nameEn: 'Arabic' },
  { code: 'hi', nameZh: '印地语', nameEn: 'Hindi' },
  { code: 'th', nameZh: '泰语', nameEn: 'Thai' },
  { code: 'vi', nameZh: '越南语', nameEn: 'Vietnamese' },
  { code: 'id', nameZh: '印尼语', nameEn: 'Indonesian' },
  { code: 'nl', nameZh: '荷兰语', nameEn: 'Dutch' },
  { code: 'pl', nameZh: '波兰语', nameEn: 'Polish' },
  { code: 'tr', nameZh: '土耳其语', nameEn: 'Turkish' },
];

export function getLangName(code: string, uiLang: 'zh' | 'en' = 'zh'): string {
  const item = LANGUAGES.find((l) => l.code === code);
  if (!item) return code;
  return uiLang === 'en' ? item.nameEn : item.nameZh;
}

export function getLangShort(code: string): string {
  if (code === 'auto') return 'AUTO';
  if (code === 'zh-CN') return 'ZH';
  if (code === 'zh-TW') return 'ZH-TW';
  return code.toUpperCase().slice(0, 4);
}
