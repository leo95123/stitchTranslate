import type { AppConfig } from '../../shared/types';
import type { TranslateResultItem } from '../../shared/messages';
import { translateAll as translateAllShared } from '../../shared/translate';

export async function translateAll(
  text: string,
  sourceLang: string,
  targetLang: string,
  config: AppConfig,
  promptOverride?: string,
): Promise<TranslateResultItem[]> {
  return translateAllShared(text, sourceLang, targetLang, config, promptOverride);
}
