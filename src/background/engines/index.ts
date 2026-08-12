import type { AppConfig, EngineId } from '../../shared/types';
import { ENGINE_META } from '../../shared/types';
import type { TranslateResultItem } from '../../shared/messages';
import { translateGoogle } from './google';
import { translateBing } from './bing';
import { translateAi } from './ai';
import type { EngineResult, TranslateParams } from './types';

async function runEngine(
  id: EngineId,
  params: TranslateParams,
  config: AppConfig,
): Promise<EngineResult> {
  switch (id) {
    case 'google':
      return translateGoogle(params);
    case 'bing':
      return translateBing(params);
    case 'ai':
      return translateAi(params, config.ai);
    default:
      throw new Error(`Unknown engine: ${id}`);
  }
}

export async function translateAll(
  text: string,
  sourceLang: string,
  targetLang: string,
  config: AppConfig,
): Promise<TranslateResultItem[]> {
  const enabled = config.engineOrder.filter((e) => e.enabled);
  const params: TranslateParams = { text, sourceLang, targetLang };

  const settled = await Promise.allSettled(
    enabled.map((e) => runEngine(e.id, params, config)),
  );

  return enabled.map((e, i) => {
    const meta = ENGINE_META[e.id];
    const label =
      e.id === 'ai' && config.ai.model
        ? `${config.ai.model} (AI)`
        : meta.label;
    const result = settled[i];

    if (result.status === 'fulfilled') {
      return {
        engineId: e.id,
        label,
        text: result.value.text,
        detectedSourceLang: result.value.detectedSourceLang,
      };
    }

    const reason = result.reason;
    const error =
      reason instanceof Error ? reason.message : String(reason ?? '翻译失败');

    return {
      engineId: e.id,
      label,
      error,
    };
  });
}
