export type EngineId = 'google' | 'bing' | 'ai';

export interface EngineOrderItem {
  id: EngineId;
  enabled: boolean;
}

export interface AiConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

export interface AppConfig {
  sourceLang: string;
  targetLang: string;
  autoDetect: boolean;
  showFloatingButton: boolean;
  engineOrder: EngineOrderItem[];
  ai: AiConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  sourceLang: 'auto',
  targetLang: 'zh-CN',
  autoDetect: true,
  showFloatingButton: true,
  engineOrder: [
    { id: 'google', enabled: true },
    { id: 'bing', enabled: true },
    { id: 'ai', enabled: true },
  ],
  ai: {
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  },
};

export const ENGINE_META: Record<
  EngineId,
  { label: string; shortLabel: string; icon: string }
> = {
  google: {
    label: 'Google Translate',
    shortLabel: 'Google',
    icon: 'g_translate',
  },
  bing: {
    label: 'Microsoft Translator',
    shortLabel: 'Bing',
    icon: 'translate',
  },
  ai: {
    label: 'AI Translate',
    shortLabel: 'AI',
    icon: 'smart_toy',
  },
};
