import type { AppConfig, AiProfile } from './types';
import { isBuiltinEngine } from './types';
import type { TranslateResultItem } from './messages';
import { engineDisplayName } from './ui-i18n';
import { translateAi } from './ai-client';
import { translateGoogle } from '../background/engines/google';
import { translateBing } from '../background/engines/bing';

export interface TranslateParams {
  text: string;
  sourceLang: string;
  targetLang: string;
}

function resolveLabel(
  id: string,
  config: AppConfig,
): { label: string; profile?: AiProfile } {
  const uiLang = config.uiLang ?? 'zh';
  if (isBuiltinEngine(id)) {
    return { label: engineDisplayName(uiLang, id) };
  }
  const profile = config.aiProfiles?.find((p) => p.id === id);
  if (profile) {
    return { label: profile.name, profile };
  }
  return { label: id };
}

async function runEngine(
  id: string,
  params: TranslateParams,
  profile?: AiProfile,
): Promise<{ text: string; detectedSourceLang?: string }> {
  if (id === 'google') return translateGoogle(params);
  if (id === 'bing') return translateBing(params);
  if (profile) {
    const result = await translateAi(params, profile);
    return { text: result.text };
  }
  throw new Error(`Unknown engine: ${id}`);
}

/**
 * Run all enabled engines in order. Safe to call from popup / content / SW.
 */
export async function translateAll(
  text: string,
  sourceLang: string,
  targetLang: string,
  config: AppConfig,
  promptOverride?: string,
): Promise<TranslateResultItem[]> {
  const profiles = config.aiProfiles ?? [];
  let order = Array.isArray(config.engineOrder) ? [...config.engineOrder] : [];

  // Ensure every AI profile appears in the run list (enabled by default)
  const seen = new Set(order.map((e) => e.id));
  for (const p of profiles) {
    if (!seen.has(p.id)) {
      order.push({ id: p.id, enabled: true });
      seen.add(p.id);
    }
  }

  const enabled = order.filter((e) => e.enabled !== false);
  const params: TranslateParams = { text, sourceLang, targetLang };
  const uiLang = config.uiLang ?? 'zh';
  const override = promptOverride?.trim();

  const settled = await Promise.allSettled(
    enabled.map((e) => {
      const { profile } = resolveLabel(e.id, config);
      const effectiveProfile =
        profile && override ? { ...profile, prompt: override } : profile;
      return runEngine(e.id, params, effectiveProfile);
    }),
  );

  return enabled.map((e, i) => {
    const { label } = resolveLabel(e.id, config);
    const result = settled[i];
    const engineId = isBuiltinEngine(e.id) ? e.id : 'ai';

    if (result.status === 'fulfilled') {
      return {
        engineId,
        label,
        text: result.value.text,
        detectedSourceLang: result.value.detectedSourceLang,
      };
    }

    const reason = result.reason;
    const error =
      reason instanceof Error
        ? reason.message
        : String(reason ?? (uiLang === 'en' ? 'Translation failed' : '翻译失败'));

    return {
      engineId,
      label,
      error,
    };
  });
}
