import type { UiLang } from './ui-i18n';

export type BuiltinEngineId = 'google' | 'bing';
export type { UiLang };

export interface EngineOrderItem {
  /** 'google' | 'bing' | ai profile id */
  id: string;
  enabled: boolean;
}

export interface AiProfile {
  id: string;
  name: string;
  prompt: string;
  model: string;
  apiKey: string;
  endpoint: string;
  /** Custom headers as JSON object string, e.g. {"X-Custom":"value"} */
  headers: string;
}

/** @deprecated migrated to aiProfiles */
export interface AiConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

export interface AppConfig {
  uiLang: UiLang;
  sourceLang: string;
  targetLang: string;
  autoDetect: boolean;
  showFloatingButton: boolean;
  engineOrder: EngineOrderItem[];
  aiProfiles: AiProfile[];
  /** Epoch ms; used to pick newer between local/sync storage */
  updatedAt?: number;
}

export const DEFAULT_AI_PROMPT = '请将以下{{source}}内容翻译为{{target}}';
export const DEFAULT_AI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export function createAiProfile(partial?: Partial<AiProfile>): AiProfile {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    name: partial?.name ?? 'AI Model',
    prompt: partial?.prompt ?? DEFAULT_AI_PROMPT,
    model: partial?.model ?? 'gpt-4o',
    apiKey: partial?.apiKey ?? '',
    endpoint: partial?.endpoint ?? DEFAULT_AI_ENDPOINT,
    headers: partial?.headers ?? '',
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  uiLang: 'zh',
  sourceLang: 'auto',
  targetLang: 'zh-CN',
  autoDetect: true,
  showFloatingButton: true,
  engineOrder: [
    { id: 'google', enabled: true },
    { id: 'bing', enabled: true },
  ],
  aiProfiles: [],
};

export const BUILTIN_ENGINE_IDS: BuiltinEngineId[] = ['google', 'bing'];

export function isBuiltinEngine(id: string): id is BuiltinEngineId {
  return id === 'google' || id === 'bing';
}

export const ENGINE_META: Record<
  BuiltinEngineId,
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
};
