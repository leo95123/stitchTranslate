import './style.css';
import type { AppConfig } from '../shared/types';
import { createPanelHost, renderPanel, requestTranslate, type PanelController } from './panel';

const FAB_ID = 'stitch-translate-fab';
const ROOT_ID = 'stitch-translate-root';

let config: AppConfig | null = null;
let fab: HTMLButtonElement | null = null;
let panelCtrl: PanelController | null = null;
let panelHost: HTMLDivElement | null = null;
let lastSelectedText = '';
let lastRect: DOMRect | null = null;

async function loadConfig() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
    if (res?.config) config = res.config as AppConfig;
  } catch {
    // extension context may be invalidated
  }
}

function ensureRoot(): HTMLDivElement {
  let root = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.style.cssText = 'all:initial;';
    document.documentElement.appendChild(root);
  }
  return root;
}

function removeFab() {
  fab?.remove();
  fab = null;
}

function closePanel() {
  panelCtrl?.destroy();
  panelCtrl = null;
  panelHost = null;
}

function showFab(rect: DOMRect) {
  if (config && !config.showFloatingButton) return;

  const root = ensureRoot();
  removeFab();

  fab = document.createElement('button');
  fab.id = FAB_ID;
  fab.type = 'button';
  fab.title = 'Stitch Translate';
  fab.className = 'stitch-fab';
  fab.style.cssText = `
    position: fixed;
    left: ${Math.min(rect.right + 8, window.innerWidth - 40)}px;
    top: ${Math.max(rect.top - 4, 8)}px;
    width: 32px;
    height: 32px;
    border-radius: 9999px;
    background: #ffffff;
    border: 1px solid #c2c6d6;
    color: #0058be;
    cursor: pointer;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-size: 16px;
    line-height: 1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  `;
  fab.textContent = '译';
  fab.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  fab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    void openPanel();
  });

  root.appendChild(fab);
}

async function openPanel() {
  const text = lastSelectedText.trim();
  if (!text || !lastRect) return;

  closePanel();
  removeFab();

  const root = ensureRoot();
  panelHost = createPanelHost();
  root.appendChild(panelHost);

  const sourceLang = config?.autoDetect ? 'auto' : config?.sourceLang ?? 'auto';
  const targetLang = config?.targetLang ?? 'zh-CN';

  panelCtrl = renderPanel(panelHost, lastRect.right + 8, lastRect.bottom + 8, {
    sourceLang,
    targetLang,
    onClose: closePanel,
  });

  try {
    const res = await requestTranslate(text, sourceLang, targetLang);
    if (!panelCtrl) return;
    if (!res.ok && res.error && !res.results?.length) {
      panelCtrl.setError(res.error);
      return;
    }
    panelCtrl.setResults(res.results ?? [], res.sourceLang, res.targetLang);
  } catch (err) {
    panelCtrl?.setError(err instanceof Error ? err.message : String(err));
  }
}

function handleSelection() {
  const sel = window.getSelection();
  const text = sel?.toString().trim() ?? '';

  if (!text || !sel || sel.rangeCount === 0) {
    if (!panelHost) removeFab();
    return;
  }

  const anchor = sel.anchorNode;
  if (anchor) {
    const el =
      anchor.nodeType === Node.ELEMENT_NODE
        ? (anchor as Element)
        : anchor.parentElement;
    if (el?.closest(`#${ROOT_ID}`)) return;
  }

  lastSelectedText = text;
  lastRect = sel.getRangeAt(0).getBoundingClientRect();
  if (lastRect.width === 0 && lastRect.height === 0) {
    removeFab();
    return;
  }

  if (!panelHost) {
    showFab(lastRect);
  }
}

function onDocMouseDown(e: MouseEvent) {
  const target = e.target as Node | null;
  if (!target) return;
  const root = document.getElementById(ROOT_ID);
  if (root?.contains(target)) return;
  closePanel();
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closePanel();
    removeFab();
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' && area !== 'local') return;
  if (changes.stitch_translate_config) {
    void loadConfig();
  }
});

void loadConfig();

document.addEventListener('mouseup', () => {
  setTimeout(handleSelection, 10);
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
    setTimeout(handleSelection, 10);
  }
});
document.addEventListener('mousedown', onDocMouseDown, true);
document.addEventListener('keydown', onKeyDown, true);
