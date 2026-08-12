import type { AppConfig, AiProfile } from './types';
import { DEFAULT_CONFIG } from './types';

export type MessageType =
  | 'TRANSLATE'
  | 'GET_CONFIG'
  | 'SAVE_CONFIG'
  | 'CONFIG_SAVED'
  | 'TEST_AI'
  | 'PING';

export interface TranslateRequest {
  type: 'TRANSLATE';
  text: string;
  sourceLang?: string;
  targetLang?: string;
  /** Temporary AI prompt override for this request only */
  promptOverride?: string;
  /** Optional snapshot so SW uses the same config the UI just read */
  config?: AppConfig;
}

export interface TranslateResultItem {
  engineId: 'google' | 'bing' | 'ai';
  label: string;
  text?: string;
  error?: string;
  detectedSourceLang?: string;
}

export interface TranslateResponse {
  ok: boolean;
  results: TranslateResultItem[];
  sourceLang: string;
  targetLang: string;
  error?: string;
}

export interface GetConfigRequest {
  type: 'GET_CONFIG';
}

export interface SaveConfigRequest {
  type: 'SAVE_CONFIG';
  config: AppConfig;
}

export interface TestAiRequest {
  type: 'TEST_AI';
  profile: AiProfile;
  text?: string;
  sourceLang?: string;
  targetLang?: string;
}

export interface TestAiResponse {
  ok: boolean;
  text?: string;
  error?: string;
}

export interface GetConfigResponse {
  ok: boolean;
  config: AppConfig;
}

export interface SaveConfigResponse {
  ok: boolean;
  error?: string;
}

export type ExtensionRequest =
  | TranslateRequest
  | GetConfigRequest
  | SaveConfigRequest
  | TestAiRequest
  | { type: 'PING' }
  | { type: 'CONFIG_SAVED' };

export type ExtensionResponse =
  | TranslateResponse
  | GetConfigResponse
  | SaveConfigResponse
  | TestAiResponse
  | { ok: boolean };

export function sendMessage<T extends ExtensionResponse>(
  message: ExtensionRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(response as T);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export { DEFAULT_CONFIG };
