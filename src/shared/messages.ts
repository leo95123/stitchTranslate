import type { AppConfig, EngineId } from './types';
import { DEFAULT_CONFIG } from './types';

export type MessageType =
  | 'TRANSLATE'
  | 'GET_CONFIG'
  | 'SAVE_CONFIG'
  | 'PING';

export interface TranslateRequest {
  type: 'TRANSLATE';
  text: string;
  sourceLang?: string;
  targetLang?: string;
}

export interface TranslateResultItem {
  engineId: EngineId;
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
  | { type: 'PING' };

export type ExtensionResponse =
  | TranslateResponse
  | GetConfigResponse
  | SaveConfigResponse
  | { ok: boolean };

export function sendMessage<T extends ExtensionResponse>(
  message: ExtensionRequest,
): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}

export { DEFAULT_CONFIG };
