import type { AppConfig, EngineOrderItem, EngineId } from './types';
import { DEFAULT_CONFIG } from './types';

const STORAGE_KEY = 'stitch_translate_config';

function isEngineId(id: unknown): id is EngineId {
  return id === 'google' || id === 'bing' || id === 'ai';
}

function normalizeEngineOrder(raw: unknown): EngineOrderItem[] {
  const defaults = DEFAULT_CONFIG.engineOrder;
  if (!Array.isArray(raw)) return [...defaults];

  const seen = new Set<EngineId>();
  const result: EngineOrderItem[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as EngineOrderItem).id;
    if (!isEngineId(id) || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      enabled: Boolean((item as EngineOrderItem).enabled),
    });
  }

  for (const d of defaults) {
    if (!seen.has(d.id)) result.push({ ...d });
  }

  return result;
}

export function normalizeConfig(raw: unknown): AppConfig {
  const base = { ...DEFAULT_CONFIG, ...(raw as Partial<AppConfig>) };
  return {
    sourceLang:
      typeof base.sourceLang === 'string' ? base.sourceLang : DEFAULT_CONFIG.sourceLang,
    targetLang:
      typeof base.targetLang === 'string' ? base.targetLang : DEFAULT_CONFIG.targetLang,
    autoDetect: Boolean(base.autoDetect ?? DEFAULT_CONFIG.autoDetect),
    showFloatingButton: Boolean(
      base.showFloatingButton ?? DEFAULT_CONFIG.showFloatingButton,
    ),
    engineOrder: normalizeEngineOrder(base.engineOrder),
    ai: {
      apiKey:
        typeof base.ai?.apiKey === 'string' ? base.ai.apiKey : DEFAULT_CONFIG.ai.apiKey,
      endpoint:
        typeof base.ai?.endpoint === 'string' && base.ai.endpoint
          ? base.ai.endpoint.replace(/\/$/, '')
          : DEFAULT_CONFIG.ai.endpoint,
      model:
        typeof base.ai?.model === 'string' && base.ai.model
          ? base.ai.model
          : DEFAULT_CONFIG.ai.model,
    },
  };
}

export async function getConfig(): Promise<AppConfig> {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    if (data[STORAGE_KEY]) {
      return normalizeConfig(data[STORAGE_KEY]);
    }
  } catch {
    // sync may fail; fall through to local
  }

  try {
    const local = await chrome.storage.local.get(STORAGE_KEY);
    if (local[STORAGE_KEY]) {
      return normalizeConfig(local[STORAGE_KEY]);
    }
  } catch {
    // ignore
  }

  return { ...DEFAULT_CONFIG, engineOrder: [...DEFAULT_CONFIG.engineOrder], ai: { ...DEFAULT_CONFIG.ai } };
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const normalized = normalizeConfig(config);
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: normalized });
  } catch {
    await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
  }
}

export function exportConfigJson(config: AppConfig): string {
  return JSON.stringify(normalizeConfig(config), null, 2);
}

export function importConfigJson(json: string): AppConfig {
  const parsed = JSON.parse(json) as unknown;
  return normalizeConfig(parsed);
}
