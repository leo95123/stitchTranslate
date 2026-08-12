import type { TranslateResultItem, TranslateResponse } from '../shared/messages';
import { getLangShort } from '../shared/i18n-langs';

export interface PanelOptions {
  sourceLang: string;
  targetLang: string;
  onClose: () => void;
}

export function createPanelHost(): HTMLDivElement {
  const host = document.createElement('div');
  host.id = 'stitch-translate-panel-host';
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483646;';
  return host;
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
  destroy: () => void;
} {
  host.innerHTML = '';
  host.style.left = `${Math.min(x, window.innerWidth - 340)}px`;
  host.style.top = `${Math.min(y, window.innerHeight - 200)}px`;

  const panel = document.createElement('div');
  panel.className = 'stitch-overlay';
  panel.style.cssText = `
    width: 320px;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #c2c6d6;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: Inter, system-ui, sans-serif;
    color: #0b1c30;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 12px; border-bottom: 1px solid #c2c6d6; background: #eff4ff;
  `;

  const langWrap = document.createElement('div');
  langWrap.style.cssText = 'display:flex;align-items:center;gap:4px;';
  langWrap.innerHTML = `
    <span style="font-size:11px;font-weight:700;letter-spacing:0.05em;color:#424754;background:#d3e4fe;padding:2px 8px;border-radius:4px;">${getLangShort(opts.sourceLang)}</span>
    <span style="font-size:14px;color:#424754;">→</span>
    <span style="font-size:11px;font-weight:700;letter-spacing:0.05em;color:#0058be;background:#d8e2ff;padding:2px 8px;border-radius:4px;">${getLangShort(opts.targetLang)}</span>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.title = '关闭';
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    border:none;background:transparent;cursor:pointer;color:#424754;
    padding:4px 6px;border-radius:4px;font-size:12px;
  `;
  closeBtn.addEventListener('click', opts.onClose);

  header.appendChild(langWrap);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.style.cssText = 'padding:12px;display:flex;flex-direction:column;gap:8px;max-height:360px;overflow:auto;';
  body.innerHTML = `<p style="font-size:13px;color:#424754;margin:0;">翻译中...</p>`;

  panel.appendChild(header);
  panel.appendChild(body);
  host.appendChild(panel);

  const setLoading = () => {
    body.innerHTML = `<p style="font-size:13px;color:#424754;margin:0;">翻译中...</p>`;
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
    langWrap.innerHTML = `
      <span style="font-size:11px;font-weight:700;letter-spacing:0.05em;color:#424754;background:#d3e4fe;padding:2px 8px;border-radius:4px;">${getLangShort(sourceLang)}</span>
      <span style="font-size:14px;color:#424754;">→</span>
      <span style="font-size:11px;font-weight:700;letter-spacing:0.05em;color:#0058be;background:#d8e2ff;padding:2px 8px;border-radius:4px;">${getLangShort(targetLang)}</span>
    `;

    body.innerHTML = '';
    if (!results.length) {
      setError('无翻译结果');
      return;
    }

    results.forEach((item, index) => {
      const isPrimary = index === 0;
      const card = document.createElement('div');
      card.style.cssText = isPrimary
        ? 'padding:8px;background:#eff4ff;border-radius:6px;position:relative;'
        : 'padding:8px;background:#ffffff;border:1px solid #c2c6d6;border-radius:6px;position:relative;';

      const top = document.createElement('div');
      top.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;';

      const tag = document.createElement('span');
      tag.className = 'stitch-engine-tag';
      tag.textContent = item.label;
      tag.style.cssText = `
        font-size:10px;text-transform:uppercase;letter-spacing:0.05em;
        padding:2px 6px;border-radius:4px;font-weight:700;
        background:${isPrimary ? '#d3e4fe' : 'transparent'};
        color:#424754;border:${isPrimary ? 'none' : '1px solid #c2c6d6'};
      `;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.title = '复制';
      copyBtn.textContent = '复制';
      copyBtn.style.cssText = `
        border:none;background:transparent;cursor:pointer;color:#424754;
        font-size:11px;padding:0 4px;
        ${item.text ? '' : 'display:none;'}
      `;
      copyBtn.addEventListener('click', async () => {
        if (!item.text) return;
        await navigator.clipboard.writeText(item.text);
        copyBtn.textContent = '已复制';
        setTimeout(() => {
          copyBtn.textContent = '复制';
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

  return { setLoading, setResults, setError, destroy };
}

export type PanelController = ReturnType<typeof renderPanel>;

export async function requestTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateResponse> {
  return chrome.runtime.sendMessage({
    type: 'TRANSLATE',
    text,
    sourceLang,
    targetLang,
  }) as Promise<TranslateResponse>;
}
