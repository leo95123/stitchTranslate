import type {
  ExtensionRequest,
  TranslateResponse,
  GetConfigResponse,
  SaveConfigResponse,
} from '../shared/messages';
import { getConfig, saveConfig } from '../shared/storage';
import { translateAll } from './engines';

chrome.runtime.onMessage.addListener((message: ExtensionRequest, _sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true; // async response
});

async function handleMessage(
  message: ExtensionRequest,
): Promise<TranslateResponse | GetConfigResponse | SaveConfigResponse | { ok: boolean }> {
  switch (message.type) {
    case 'PING':
      return { ok: true };

    case 'GET_CONFIG': {
      const config = await getConfig();
      return { ok: true, config };
    }

    case 'SAVE_CONFIG': {
      try {
        await saveConfig(message.config);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    case 'TRANSLATE': {
      const text = message.text?.trim();
      if (!text) {
        return {
          ok: false,
          results: [],
          sourceLang: 'auto',
          targetLang: 'en',
          error: '请输入要翻译的文本',
        };
      }

      try {
        const config = await getConfig();
        const sourceLang =
          message.sourceLang ??
          (config.autoDetect ? 'auto' : config.sourceLang) ??
          'auto';
        const targetLang = message.targetLang ?? config.targetLang ?? 'zh-CN';

        const results = await translateAll(text, sourceLang, targetLang, config);

        // Prefer detected language from first successful result
        const detected =
          results.find((r) => r.detectedSourceLang)?.detectedSourceLang ?? sourceLang;

        return {
          ok: true,
          results,
          sourceLang: detected,
          targetLang,
        };
      } catch (err) {
        return {
          ok: false,
          results: [],
          sourceLang: message.sourceLang ?? 'auto',
          targetLang: message.targetLang ?? 'zh-CN',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    default:
      return { ok: false };
  }
}
