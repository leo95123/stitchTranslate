import type {
  ExtensionRequest,
  TranslateResponse,
  GetConfigResponse,
  SaveConfigResponse,
  TestAiResponse,
} from '../shared/messages';
import { getConfig, saveConfig, normalizeConfig } from '../shared/storage';
import { t } from '../shared/ui-i18n';
import { translateAll } from './engines';
import { translateAi } from './engines/ai';

const CONTEXT_MENU_ID = 'stitch-translate-selection';

function contextMenuTitle(uiLang: 'zh' | 'en'): string {
  return t(uiLang, 'app.contextMenu');
}

async function setupContextMenus() {
  try {
    await chrome.contextMenus.removeAll();
    const config = await getConfig();
    await chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: contextMenuTitle(config.uiLang ?? 'zh'),
      contexts: ['selection'],
    });
  } catch {
    // SW may race with removeAll; ignore
  }
}

async function broadcastConfigUpdated() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) return;
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'CONFIG_UPDATED' });
      } catch {
        // tab without content script
      }
    }),
  );
}

chrome.runtime.onInstalled.addListener(() => {
  void setupContextMenus();
});
chrome.runtime.onStartup.addListener(() => {
  void setupContextMenus();
});
void setupContextMenus();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const text = info.selectionText?.trim();
  if (!text || !tab?.id) return;

  void chrome.tabs
    .sendMessage(tab.id, {
      type: 'OPEN_TRANSLATE_PANEL',
      text,
    })
    .catch(() => {
      // content script unavailable (e.g. chrome:// pages)
    });
});

chrome.runtime.onMessage.addListener((message: ExtensionRequest, _sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true; // async response
});

async function handleMessage(
  message: ExtensionRequest,
): Promise<
  TranslateResponse | GetConfigResponse | SaveConfigResponse | TestAiResponse | { ok: boolean }
> {
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
        await setupContextMenus();
        void broadcastConfigUpdated();
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    case 'CONFIG_SAVED': {
      await setupContextMenus();
      void broadcastConfigUpdated();
      return { ok: true };
    }

    case 'TEST_AI': {
      try {
        const profile = message.profile;
        if (!profile || typeof profile !== 'object') {
          return { ok: false, error: '无效的模型配置' };
        }
        if (!profile.endpoint?.trim()) {
          return { ok: false, error: '请填写完整接口地址（含 chat/completions）' };
        }
        if (!profile.apiKey?.trim()) {
          return { ok: false, error: '请填写 API Key' };
        }

        const text = message.text?.trim() || 'Hello';
        const sourceLang = message.sourceLang || 'en';
        const targetLang = message.targetLang || 'zh-CN';
        const result = await translateAi(
          { text, sourceLang, targetLang },
          {
            id: profile.id || 'test',
            name: profile.name || 'AI',
            prompt: profile.prompt || '',
            model: profile.model || '',
            apiKey: profile.apiKey || '',
            endpoint: profile.endpoint || '',
            headers: profile.headers || '',
          },
        );
        return { ok: true, text: result.text };
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
        const config = message.config
          ? normalizeConfig(message.config)
          : await getConfig();
        const sourceLang =
          message.sourceLang ??
          (config.autoDetect ? 'auto' : config.sourceLang) ??
          'auto';
        const targetLang = message.targetLang ?? config.targetLang ?? 'zh-CN';

        const results = await translateAll(
          text,
          sourceLang,
          targetLang,
          config,
          message.promptOverride,
        );

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
