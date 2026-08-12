import type { AiProfile } from '../../shared/types';
import type { EngineResult, TranslateParams } from './types';
import { translateAi as translateAiShared } from '../../shared/ai-client';

export async function translateAi(
  params: TranslateParams,
  profile: AiProfile,
): Promise<EngineResult> {
  return translateAiShared(params, profile);
}
