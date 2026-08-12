export interface TranslateParams {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface EngineResult {
  text: string;
  detectedSourceLang?: string;
}

export type TranslateEngine = (params: TranslateParams) => Promise<EngineResult>;
