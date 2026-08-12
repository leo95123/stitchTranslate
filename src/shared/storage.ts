import type { AppConfig, EngineOrderItem, AiProfile, AiConfig } from './types';
import {
  DEFAULT_CONFIG,
  DEFAULT_AI_PROMPT,
  DEFAULT_AI_ENDPOINT,
  createAiProfile,
  isBuiltinEngine,
  BUILTIN_ENGINE_IDS,
} from './types';
import { isUiLang } from './ui-i18n';

export const STORAGE_KEY = 'stitch_translate_config';

/** Migrate base URL (…/v1) to full chat/completions URL */
function normalizeEndpoint(raw: string | undefined): string {
  const value = (raw ?? '').trim().replace(/\/$/, '');
  if (!value) return DEFAULT_AI_ENDPOINT;
  if (/chat\/completions\/?$/i.test(value)) return value.replace(/\/$/, '');
  return `${value}/chat/completions`;
}

function normalizeAiProfile(raw: unknown): AiProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<AiProfile>;
  if (typeof r.id !== 'string' || !r.id) return null;
  return {
    id: r.id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : 'AI Model',
    prompt:
      typeof r.prompt === 'string' && r.prompt.trim()
        ? r.prompt
        : DEFAULT_AI_PROMPT,
    model: typeof r.model === 'string' && r.model.trim() ? r.model.trim() : 'gpt-4o',
    apiKey: typeof r.apiKey === 'string' ? r.apiKey : '',
    endpoint: normalizeEndpoint(
      typeof r.endpoint === 'string' ? r.endpoint : DEFAULT_AI_ENDPOINT,
    ),
    headers: typeof r.headers === 'string' ? r.headers : '',
  };
}

function migrateLegacyAi(
  raw: Partial<AppConfig> & { ai?: AiConfig },
): AiProfile[] {
  const profiles: AiProfile[] = [];
  if (Array.isArray(raw.aiProfiles)) {
    for (const item of raw.aiProfiles) {
      const p = normalizeAiProfile(item);
      if (p) profiles.push(p);
    }
  }

  if (!profiles.length && raw.ai && typeof raw.ai === 'object') {
    const legacy = raw.ai;
    if (legacy.apiKey || legacy.model || legacy.endpoint) {
      profiles.push(
        createAiProfile({
          name: legacy.model || 'AI Model',
          model: legacy.model || 'gpt-4o',
          apiKey: legacy.apiKey || '',
          endpoint: normalizeEndpoint(legacy.endpoint || DEFAULT_AI_ENDPOINT),
        }),
      );
    }
  }

  return profiles;
}

function normalizeEngineOrder(
  raw: unknown,
  aiProfiles: AiProfile[],
): EngineOrderItem[] {
  const aiIds = new Set(aiProfiles.map((p) => p.id));
  const seen = new Set<string>();
  const result: EngineOrderItem[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      let id = (item as EngineOrderItem).id;
      if (id === 'ai') {
        id = aiProfiles[0]?.id ?? '';
        if (!id) continue;
      }
      if (!id || seen.has(id)) continue;
      if (!isBuiltinEngine(id) && !aiIds.has(id)) continue;
      seen.add(id);
      result.push({
        id,
        // Default-on: missing/undefined enabled must not drop engines
        enabled: (item as EngineOrderItem).enabled !== false,
      });
    }
  }

  for (const id of BUILTIN_ENGINE_IDS) {
    if (!seen.has(id)) {
      result.push({ id, enabled: true });
      seen.add(id);
    }
  }

  for (const p of aiProfiles) {
    if (!seen.has(p.id)) {
      result.push({ id: p.id, enabled: true });
      seen.add(p.id);
    }
  }

  return result;
}

function readUpdatedAt(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  const ts = (raw as { updatedAt?: unknown }).updatedAt;
  return typeof ts === 'number' && Number.isFinite(ts) ? ts : 0;
}

export function normalizeConfig(raw: unknown): AppConfig {
  const base = { ...DEFAULT_CONFIG, ...(raw as Partial<AppConfig>) };
  const source = raw && typeof raw === 'object' ? (raw as Partial<AppConfig>) : {};
  const aiProfiles = migrateLegacyAi(source as Partial<AppConfig> & { ai?: AiConfig });
  const updatedAt = readUpdatedAt(raw);

  return {
    uiLang: isUiLang(base.uiLang) ? base.uiLang : DEFAULT_CONFIG.uiLang,
    sourceLang:
      typeof base.sourceLang === 'string' ? base.sourceLang : DEFAULT_CONFIG.sourceLang,
    targetLang:
      typeof base.targetLang === 'string' ? base.targetLang : DEFAULT_CONFIG.targetLang,
    autoDetect: Boolean(base.autoDetect ?? DEFAULT_CONFIG.autoDetect),
    showFloatingButton: Boolean(
      base.showFloatingButton ?? DEFAULT_CONFIG.showFloatingButton,
    ),
    aiProfiles,
    engineOrder: normalizeEngineOrder(base.engineOrder, aiProfiles),
    updatedAt: updatedAt || undefined,
  };
}

export async function getConfig(): Promise<AppConfig> {
  try {
    const local = await chrome.storage.local.get(STORAGE_KEY);
    if (local[STORAGE_KEY]) {
      return normalizeConfig(local[STORAGE_KEY]);
    }
  } catch {
    // ignore
  }

  // One-time migrate from sync if local is empty
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    if (data[STORAGE_KEY]) {
      const migrated = normalizeConfig({
        ...normalizeConfig(data[STORAGE_KEY]),
        updatedAt: Date.now(),
      });
      await chrome.storage.local.set({ [STORAGE_KEY]: migrated });
      return migrated;
    }
  } catch {
    // ignore
  }

  return normalizeConfig(DEFAULT_CONFIG);
}

export async function saveConfig(config: AppConfig): Promise<AppConfig> {
  const normalized = normalizeConfig({
    ...config,
    updatedAt: Date.now(),
  });

  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
  return normalized;
}

/** Read-modify-write merge to avoid stale writers wiping AI profiles */
export async function patchConfig(
  patch: Partial<AppConfig> | ((current: AppConfig) => AppConfig),
): Promise<AppConfig> {
  const current = await getConfig();
  const next =
    typeof patch === 'function'
      ? patch(current)
      : {
          ...current,
          ...patch,
          aiProfiles: patch.aiProfiles ?? current.aiProfiles,
          engineOrder: patch.engineOrder ?? current.engineOrder,
        };
  return saveConfig(next);
}

export function onConfigChanged(callback: (config: AppConfig) => void): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName !== 'local') return;
    if (!changes[STORAGE_KEY]) return;
    void getConfig().then(callback);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function exportConfigJson(config: AppConfig): string {
  return JSON.stringify(normalizeConfig(config), null, 2);
}

export function importConfigJson(json: string): AppConfig {
  const parsed = JSON.parse(json) as unknown;
  return normalizeConfig(parsed);
}
