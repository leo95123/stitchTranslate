import './style.css';
import type { AppConfig, UiLang } from '../shared/types';
import { DEFAULT_AI_PROMPT, isBuiltinEngine } from '../shared/types';
import type { TranslateResultItem } from '../shared/messages';
import { getConfig, onConfigChanged, patchConfig } from '../shared/storage';
import { ensureAiEndpointPermissions } from '../shared/host-permission';
import { translateAll } from '../shared/translate';
import { LANGUAGES, getLangName } from '../shared/i18n-langs';
import { applyDomI18n, t } from '../shared/ui-i18n';

const inputEl = document.getElementById('input-text') as HTMLTextAreaElement;
const resultsEl = document.getElementById('results') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const selectSource = document.getElementById('select-source') as HTMLSelectElement;
const selectTarget = document.getElementById('select-target') as HTMLSelectElement;
const sourceLabel = document.getElementById('source-lang-label') as HTMLSpanElement;
const targetLabel = document.getElementById('target-lang-label') as HTMLSpanElement;
const promptOverrideEl = document.getElementById('prompt-override') as HTMLTextAreaElement;
const promptPanel = document.getElementById('prompt-panel') as HTMLDivElement;
const promptChevron = document.getElementById('prompt-chevron') as HTMLSpanElement;

let config: AppConfig | null = null;
let requestSeq = 0;

function uiLang(): UiLang {
  return config?.uiLang ?? 'zh';
}

function fillLangSelects() {
  const lang = uiLang();
  const srcVal = selectSource.value;
  const tgtVal = selectTarget.value;

  selectSource.innerHTML = '';
  selectTarget.innerHTML = '';

  for (const item of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = item.code;
    opt.textContent = getLangName(item.code, lang);
    selectSource.appendChild(opt);
  }

  for (const item of LANGUAGES.filter((l) => l.code !== 'auto')) {
    const opt = document.createElement('option');
    opt.value = item.code;
    opt.textContent = getLangName(item.code, lang);
    selectTarget.appendChild(opt);
  }

  if (srcVal) selectSource.value = srcVal;
  if (tgtVal) selectTarget.value = tgtVal;
}

function syncLangLabels() {
  const lang = uiLang();
  sourceLabel.textContent = getLangName(selectSource.value, lang);
  targetLabel.textContent = getLangName(selectTarget.value, lang);
}

function refreshI18n() {
  applyDomI18n(document, uiLang());
  fillLangSelects();
  syncLangLabels();
}

function setStatus(text: string, visible = true) {
  statusEl.textContent = text;
  statusEl.classList.toggle('hidden', !visible || !text);
}

function engineIcon(engineId: 'google' | 'bing' | 'ai'): string {
  if (engineId === 'google') return 'g_translate';
  if (engineId === 'bing') return 'translate';
  return 'smart_toy';
}

function renderResults(results: TranslateResultItem[]) {
  resultsEl.innerHTML = '';
  const lang = uiLang();

  results.forEach((item, index) => {
    const isAi = item.engineId === 'ai';
    const card = document.createElement('div');
    card.className = isAi
      ? 'bg-surface-container-low rounded-lg border border-primary/20 p-md shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow relative overflow-hidden group'
      : 'bg-surface-container-lowest rounded-lg border border-outline-variant p-md shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow relative overflow-hidden group';

    const iconWrapClass = isAi
      ? 'w-5 h-5 bg-primary rounded-full flex items-center justify-center text-on-primary'
      : 'w-5 h-5 bg-surface-container rounded-full flex items-center justify-center text-primary';

    const labelClass = isAi
      ? 'text-label-md font-bold text-primary'
      : 'text-label-md text-on-surface-variant';

    const body = item.error
      ? `<p class="text-body-md text-error">${escapeHtml(item.error)}</p>`
      : `<p class="text-body-md text-on-surface">${escapeHtml(item.text ?? '')}</p>`;

    card.innerHTML = `
      <div class="absolute top-0 left-0 w-full h-[0.5px] bg-white opacity-50"></div>
      <div class="flex items-center justify-between mb-sm">
        <div class="flex items-center gap-xs">
          <div class="${iconWrapClass}">
            <span class="material-symbols-outlined text-[14px]">${engineIcon(item.engineId)}</span>
          </div>
          <span class="${labelClass}">${escapeHtml(item.label)}</span>
        </div>
        <div class="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
          ${
            item.text
              ? `<button type="button" data-copy="${index}" class="p-xs rounded text-on-surface-variant hover:bg-surface-container transition-colors" title="${t(lang, 'popup.copy')}">
                  <span class="material-symbols-outlined text-[16px]">content_copy</span>
                </button>`
              : ''
          }
        </div>
      </div>
      ${body}
    `;

    resultsEl.appendChild(card);
  });

  resultsEl.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.copy);
      const text = results[idx]?.text;
      if (!text) return;
      await navigator.clipboard.writeText(text);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = 'check';
        setTimeout(() => {
          icon.textContent = 'content_copy';
        }, 1500);
      }
    });
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function reloadConfig(opts?: { syncPrompt?: boolean }) {
  try {
    const prevPromptDefault = config ? firstEnabledAiPrompt(config) : '';
    config = await getConfig();
    refreshI18n();
    if (opts?.syncPrompt !== false) {
      const current = promptOverrideEl.value.trim();
      if (!current || current === prevPromptDefault) {
        promptOverrideEl.value = firstEnabledAiPrompt(config);
      }
    }
  } catch {
    // ignore
  }
}

async function doTranslate() {
  const text = inputEl.value.trim();
  if (!text) {
    resultsEl.innerHTML = '';
    setStatus('', false);
    return;
  }

  const seq = ++requestSeq;
  setStatus(t(uiLang(), 'popup.translating'));

  try {
    // Read config in popup and translate here — same data as Options page
    const cfg = await getConfig();
    config = cfg;
    refreshI18n();

    const promptOverride = promptPanel.classList.contains('hidden')
      ? undefined
      : promptOverrideEl.value.trim() || undefined;

    // Request optional host access for custom AI endpoints (user gesture)
    const enabledAi = (cfg.engineOrder ?? [])
      .filter((e) => e.enabled !== false && !isBuiltinEngine(e.id))
      .map((e) => cfg.aiProfiles?.find((p) => p.id === e.id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (enabledAi.length) {
      await ensureAiEndpointPermissions(enabledAi);
    }

    const results = await translateAll(
      text,
      selectSource.value,
      selectTarget.value,
      cfg,
      promptOverride,
    );

    if (seq !== requestSeq) return;

    setStatus('', false);
    renderResults(results);

    const enabledCount = (cfg.engineOrder ?? []).filter((e) => e.enabled !== false).length;
    const aiEnabled = (cfg.engineOrder ?? []).filter(
      (e) => e.enabled !== false && !isBuiltinEngine(e.id),
    ).length;
    if (aiEnabled > 0 && !results.some((r) => r.engineId === 'ai')) {
      setStatus(
        uiLang() === 'en'
          ? `AI configured but missing from results (${enabledCount} engines).`
          : `已配置 AI 但结果中缺失（共 ${enabledCount} 个引擎）`,
      );
    }
  } catch (err) {
    if (seq !== requestSeq) return;
    setStatus(err instanceof Error ? err.message : String(err));
  }
}

async function persistLangs() {
  try {
    config = await patchConfig({
      sourceLang: selectSource.value,
      targetLang: selectTarget.value,
    });
  } catch {
    // ignore
  }
}

function firstEnabledAiPrompt(cfg: AppConfig): string {
  for (const item of cfg.engineOrder) {
    if (!item.enabled || isBuiltinEngine(item.id)) continue;
    const profile = cfg.aiProfiles?.find((p) => p.id === item.id);
    if (profile?.prompt?.trim()) return profile.prompt;
  }
  const any = cfg.aiProfiles?.find((p) => p.prompt?.trim());
  return any?.prompt || DEFAULT_AI_PROMPT;
}

async function init() {
  config = await getConfig();

  refreshI18n();
  selectSource.value = config.sourceLang || 'auto';
  selectTarget.value = config.targetLang || 'zh-CN';
  syncLangLabels();
  promptOverrideEl.value = firstEnabledAiPrompt(config);

  inputEl.focus();

  document.getElementById('btn-toggle-prompt')?.addEventListener('click', () => {
    const open = promptPanel.classList.toggle('hidden') === false;
    promptChevron.textContent = open ? 'expand_less' : 'expand_more';
  });

  document.getElementById('btn-translate')?.addEventListener('click', () => {
    void doTranslate();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void doTranslate();
    }
  });

  document.getElementById('btn-clear')?.addEventListener('click', () => {
    inputEl.value = '';
    resultsEl.innerHTML = '';
    setStatus('', false);
    inputEl.focus();
  });

  selectSource.addEventListener('change', () => {
    syncLangLabels();
    void persistLangs();
  });
  selectTarget.addEventListener('change', () => {
    syncLangLabels();
    void persistLangs();
  });

  document.getElementById('btn-swap')?.addEventListener('click', () => {
    const src = selectSource.value;
    const tgt = selectTarget.value;
    if (src === 'auto') {
      selectSource.value = tgt;
    } else {
      selectSource.value = tgt;
      selectTarget.value = src;
    }
    if (selectTarget.value === 'auto') {
      selectTarget.value = 'en';
    }
    syncLangLabels();
    void persistLangs();
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  onConfigChanged(() => {
    void reloadConfig({ syncPrompt: true });
  });
}

void init();
