import './style.css';
import type { AppConfig, EngineId } from '../shared/types';
import { ENGINE_META } from '../shared/types';
import type { TranslateResponse, TranslateResultItem } from '../shared/messages';
import { sendMessage } from '../shared/messages';
import { LANGUAGES, getLangName } from '../shared/i18n-langs';

const inputEl = document.getElementById('input-text') as HTMLTextAreaElement;
const resultsEl = document.getElementById('results') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const selectSource = document.getElementById('select-source') as HTMLSelectElement;
const selectTarget = document.getElementById('select-target') as HTMLSelectElement;
const sourceLabel = document.getElementById('source-lang-label') as HTMLSpanElement;
const targetLabel = document.getElementById('target-lang-label') as HTMLSpanElement;

let config: AppConfig | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let requestSeq = 0;

function fillLangSelects() {
  selectSource.innerHTML = '';
  selectTarget.innerHTML = '';

  for (const lang of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.name;
    selectSource.appendChild(opt);
  }

  for (const lang of LANGUAGES.filter((l) => l.code !== 'auto')) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = lang.name;
    selectTarget.appendChild(opt);
  }
}

function syncLangLabels() {
  sourceLabel.textContent = getLangName(selectSource.value);
  targetLabel.textContent = getLangName(selectTarget.value);
}

function setStatus(text: string, visible = true) {
  statusEl.textContent = text;
  statusEl.classList.toggle('hidden', !visible || !text);
}

function engineIcon(id: EngineId): string {
  return ENGINE_META[id].icon;
}

function renderResults(results: TranslateResultItem[]) {
  resultsEl.innerHTML = '';

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
              ? `<button type="button" data-copy="${index}" class="p-xs rounded text-on-surface-variant hover:bg-surface-container transition-colors" title="复制">
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

async function doTranslate() {
  const text = inputEl.value.trim();
  if (!text) {
    resultsEl.innerHTML = '';
    setStatus('', false);
    return;
  }

  const seq = ++requestSeq;
  setStatus('翻译中...');

  try {
    const res = await sendMessage<TranslateResponse>({
      type: 'TRANSLATE',
      text,
      sourceLang: selectSource.value,
      targetLang: selectTarget.value,
    });

    if (seq !== requestSeq) return;

    if (!res.ok && res.error && !res.results?.length) {
      setStatus(res.error);
      resultsEl.innerHTML = '';
      return;
    }

    setStatus('', false);
    renderResults(res.results ?? []);
  } catch (err) {
    if (seq !== requestSeq) return;
    setStatus(err instanceof Error ? err.message : String(err));
  }
}

function scheduleTranslate() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void doTranslate();
  }, 400);
}

async function persistLangs() {
  if (!config) return;
  config = {
    ...config,
    sourceLang: selectSource.value,
    targetLang: selectTarget.value,
  };
  await sendMessage({ type: 'SAVE_CONFIG', config });
}

async function init() {
  fillLangSelects();

  const res = await sendMessage<{ ok: boolean; config: AppConfig }>({ type: 'GET_CONFIG' });
  config = res.config;

  selectSource.value = config.sourceLang || 'auto';
  selectTarget.value = config.targetLang || 'zh-CN';
  syncLangLabels();

  inputEl.addEventListener('input', scheduleTranslate);
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    inputEl.value = '';
    resultsEl.innerHTML = '';
    setStatus('', false);
    inputEl.focus();
  });

  selectSource.addEventListener('change', () => {
    syncLangLabels();
    void persistLangs();
    scheduleTranslate();
  });
  selectTarget.addEventListener('change', () => {
    syncLangLabels();
    void persistLangs();
    scheduleTranslate();
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
    scheduleTranslate();
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

void init();
