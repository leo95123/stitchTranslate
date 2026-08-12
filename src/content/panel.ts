import type { TranslateResultItem, TranslateResponse } from '../shared/messages';
import { LANGUAGES, getLangShort } from '../shared/i18n-langs';
import type { UiLang } from '../shared/types';
import { DEFAULT_AI_PROMPT } from '../shared/types';
import { getConfig } from '../shared/storage';
import { t } from '../shared/ui-i18n';

export interface PanelTranslateParams {
  promptOverride: string;
  sourceLang: string;
  targetLang: string;
}

export interface PanelOptions {
  sourceLang: string;
  targetLang: string;
  uiLang: UiLang;
  initialPrompt?: string;
  onClose: () => void;
  onRetranslate?: (params: PanelTranslateParams) => void;
}

export function createPanelHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.id = 'stitch-translate-panel-host';
  host.style.cssText =
    'all:initial;position:fixed;z-index:2147483646;pointer-events:auto;';
  return host;
}

function fillLangSelect(
  select: HTMLSelectElement,
  uiLang: UiLang,
  selected: string,
  includeAuto: boolean,
) {
  select.innerHTML = '';
  const list = includeAuto ? LANGUAGES : LANGUAGES.filter((l) => l.code !== 'auto');
  for (const item of list) {
    const opt = document.createElement('option');
    opt.value = item.code;
    opt.textContent = uiLang === 'en' ? item.nameEn : item.nameZh;
    if (item.code === selected) opt.selected = true;
    select.appendChild(opt);
  }
}

export function renderPanel(
  host: HTMLDivElement,
  x: number,
  y: number,
  opts: PanelOptions,
): {
  setLoading: () => void;
  setResults: (results: TranslateResultItem[], sourceLang: string, targetLang: string) => void;
  setError: (msg: string) => void;
  getParams: () => PanelTranslateParams;
  destroy: () => void;
} {
  const lang = opts.uiLang ?? 'zh';
  host.innerHTML = '';
  host.style.left = `${Math.min(Math.max(8, x), window.innerWidth - 380)}px`;
  host.style.top = `${Math.min(Math.max(8, y), window.innerHeight - 240)}px`;

  const panel = document.createElement('div');
  panel.className = 'stitch-overlay';
  panel.style.cssText = `
    width: 360px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #c2c6d6;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
    color: #0b1c30;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 12px; border-bottom: 1px solid #c2c6d6; background: #eff4ff;
  `;

  const langWrap = document.createElement('div');
  langWrap.style.cssText = 'display:flex;align-items:center;gap:4px;';
  langWrap.innerHTML = `
    <span data-src-badge style="font-size:11px;font-weight:700;letter-spacing:0.05em;color:#424754;background:#d3e4fe;padding:2px 8px;border-radius:4px;">${getLangShort(opts.sourceLang)}</span>
    <span style="font-size:14px;color:#424754;">→</span>
    <span data-tgt-badge style="font-size:11px;font-weight:700;letter-spacing:0.05em;color:#0058be;background:#d8e2ff;padding:2px 8px;border-radius:4px;">${getLangShort(opts.targetLang)}</span>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.title = t(lang, 'panel.close');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    border:none;background:transparent;cursor:pointer;color:#424754;
    padding:4px 6px;border-radius:4px;font-size:12px;
  `;
  closeBtn.addEventListener('click', opts.onClose);

  header.appendChild(langWrap);
  header.appendChild(closeBtn);

  const controls = document.createElement('div');
  controls.style.cssText =
    'padding:8px 12px;border-bottom:1px solid #c2c6d6;background:#f8f9ff;display:flex;flex-direction:column;gap:8px;';

  const langRow = document.createElement('div');
  langRow.style.cssText = 'display:flex;align-items:center;gap:6px;';

  const sourceSelect = document.createElement('select');
  sourceSelect.style.cssText =
    'flex:1;min-width:0;border:1px solid #c2c6d6;border-radius:6px;padding:4px 6px;font-size:12px;background:#fff;';
  fillLangSelect(sourceSelect, lang, opts.sourceLang, true);

  const targetSelect = document.createElement('select');
  targetSelect.style.cssText =
    'flex:1;min-width:0;border:1px solid #c2c6d6;border-radius:6px;padding:4px 6px;font-size:12px;background:#fff;';
  fillLangSelect(targetSelect, lang, opts.targetLang, false);

  const swapBtn = document.createElement('button');
  swapBtn.type = 'button';
  swapBtn.textContent = '⇄';
  swapBtn.title = t(lang, 'popup.swap');
  swapBtn.style.cssText =
    'border:none;background:#0058be;color:#fff;border-radius:9999px;width:28px;height:28px;cursor:pointer;flex-shrink:0;';
  swapBtn.addEventListener('click', () => {
    const src = sourceSelect.value;
    const tgt = targetSelect.value;
    if (src === 'auto') {
      sourceSelect.value = tgt;
    } else {
      sourceSelect.value = tgt;
      targetSelect.value = src;
    }
    if (targetSelect.value === 'auto') targetSelect.value = 'en';
    updateBadges();
  });

  langRow.appendChild(sourceSelect);
  langRow.appendChild(swapBtn);
  langRow.appendChild(targetSelect);

  const promptLabel = document.createElement('div');
  promptLabel.style.cssText = 'font-size:11px;font-weight:600;color:#424754;';
  promptLabel.textContent = t(lang, 'popup.prompt');

  const promptInput = document.createElement('textarea');
  promptInput.rows = 2;
  promptInput.value = opts.initialPrompt || DEFAULT_AI_PROMPT;
  promptInput.style.cssText = `
    width:100%;box-sizing:border-box;resize:vertical;min-height:40px;max-height:90px;
    border:1px solid #c2c6d6;border-radius:6px;padding:6px 8px;font-size:12px;line-height:16px;
    font-family:inherit;color:#0b1c30;outline:none;
  `;

  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.textContent = t(lang, 'popup.translate');
  applyBtn.style.cssText = `
    align-self:flex-end;border:none;background:#0058be;color:#fff;border-radius:6px;
    padding:6px 12px;font-size:12px;cursor:pointer;
  `;
  applyBtn.addEventListener('click', () => {
    opts.onRetranslate?.(getParams());
  });

  controls.appendChild(langRow);
  controls.appendChild(promptLabel);
  controls.appendChild(promptInput);
  controls.appendChild(applyBtn);

  const body = document.createElement('div');
  body.style.cssText =
    'padding:12px;display:flex;flex-direction:column;gap:8px;max-height:280px;overflow:auto;';
  body.innerHTML = `<p style="font-size:13px;color:#424754;margin:0;"></p>`;
  (body.firstChild as HTMLElement).textContent = t(lang, 'panel.translating');

  panel.appendChild(header);
  panel.appendChild(controls);
  panel.appendChild(body);
  host.appendChild(panel);

  const updateBadges = () => {
    const srcBadge = langWrap.querySelector('[data-src-badge]');
    const tgtBadge = langWrap.querySelector('[data-tgt-badge]');
    if (srcBadge) srcBadge.textContent = getLangShort(sourceSelect.value);
    if (tgtBadge) tgtBadge.textContent = getLangShort(targetSelect.value);
  };

  sourceSelect.addEventListener('change', updateBadges);
  targetSelect.addEventListener('change', updateBadges);

  const getParams = (): PanelTranslateParams => ({
    promptOverride: promptInput.value.trim(),
    sourceLang: sourceSelect.value,
    targetLang: targetSelect.value,
  });

  const setLoading = () => {
    body.innerHTML = `<p style="font-size:13px;color:#424754;margin:0;"></p>`;
    (body.firstChild as HTMLElement).textContent = t(lang, 'panel.translating');
  };

  const setError = (msg: string) => {
    body.innerHTML = `<p style="font-size:13px;color:#ba1a1a;margin:0;"></p>`;
    (body.firstChild as HTMLElement).textContent = msg;
  };

  const setResults = (
    results: TranslateResultItem[],
    sourceLang: string,
    targetLang: string,
  ) => {
    const srcBadge = langWrap.querySelector('[data-src-badge]');
    const tgtBadge = langWrap.querySelector('[data-tgt-badge]');
    if (srcBadge) srcBadge.textContent = getLangShort(sourceLang);
    if (tgtBadge) tgtBadge.textContent = getLangShort(targetLang);

    body.innerHTML = '';
    if (!results.length) {
      setError(t(lang, 'panel.empty'));
      return;
    }

    results.forEach((item, index) => {
      const isPrimary = index === 0;
      const card = document.createElement('div');
      card.style.cssText = isPrimary
        ? 'padding:8px;background:#eff4ff;border-radius:6px;position:relative;'
        : 'padding:8px;background:#ffffff;border:1px solid #c2c6d6;border-radius:6px;position:relative;';

      const top = document.createElement('div');
      top.style.cssText =
        'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;';

      const tag = document.createElement('span');
      tag.textContent = item.label;
      tag.style.cssText = `
        font-size:10px;text-transform:uppercase;letter-spacing:0.05em;
        padding:2px 6px;border-radius:4px;font-weight:700;
        background:${isPrimary ? '#d3e4fe' : 'transparent'};
        color:#424754;border:${isPrimary ? 'none' : '1px solid #c2c6d6'};
      `;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.textContent = t(lang, 'panel.copy');
      copyBtn.style.cssText = `
        border:none;background:transparent;cursor:pointer;color:#424754;
        font-size:11px;padding:0 4px;${item.text ? '' : 'display:none;'}
      `;
      copyBtn.addEventListener('click', async () => {
        if (!item.text) return;
        await navigator.clipboard.writeText(item.text);
        copyBtn.textContent = t(lang, 'panel.copied');
        setTimeout(() => {
          copyBtn.textContent = t(lang, 'panel.copy');
        }, 1500);
      });

      top.appendChild(tag);
      top.appendChild(copyBtn);

      const p = document.createElement('p');
      p.style.cssText = `font-size:13px;line-height:18px;margin:0;color:${item.error ? '#ba1a1a' : '#0b1c30'};`;
      p.textContent = item.error ?? item.text ?? '';

      card.appendChild(top);
      card.appendChild(p);
      body.appendChild(card);
    });
  };

  const destroy = () => {
    host.remove();
  };

  return { setLoading, setResults, setError, getParams, destroy };
}

export type PanelController = ReturnType<typeof renderPanel>;

export async function requestTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
  promptOverride?: string,
): Promise<TranslateResponse> {
  const config = await getConfig();
  // Run in SW (host_permissions) but pass the same config snapshot the UI loaded
  return chrome.runtime.sendMessage({
    type: 'TRANSLATE',
    text,
    sourceLang,
    targetLang,
    promptOverride: promptOverride || undefined,
    config,
  }) as Promise<TranslateResponse>;
}
