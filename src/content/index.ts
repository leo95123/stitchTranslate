import './style.css';
import type { AppConfig } from '../shared/types';
import { DEFAULT_AI_PROMPT, isBuiltinEngine } from '../shared/types';
import { getConfig, onConfigChanged } from '../shared/storage';
import {
  createPanelHost,
  renderPanel,
  requestTranslate,
  type PanelController,
  type PanelTranslateParams,
} from './panel';

const FAB_ID = 'stitch-translate-fab';
const ROOT_ID = 'stitch-translate-root';
const FAB_SHOW_DELAY_MS = 200;

let config: AppConfig | null = null;
let fab: HTMLButtonElement | null = null;
let panelCtrl: PanelController | null = null;
let panelHost: HTMLDivElement | null = null;
let lastSelectedText = '';
let lastRect: DOMRect | null = null;
let lastPointer = { x: 24, y: 24 };
let rootHost: HTMLDivElement | null = null;
let shadowMount: HTMLDivElement | null = null;
let fabShowTimer: ReturnType<typeof window.setTimeout> | null = null;
/** Primary button still held (mouse drag / touch selecting) */
let primaryPointerDown = false;

function cancelFabShowTimer() {
  if (fabShowTimer != null) {
    window.clearTimeout(fabShowTimer);
    fabShowTimer = null;
  }
}

function hideFabWhileSelecting() {
  cancelFabShowTimer();
  if (!panelHost) removeFab();
}

async function loadConfig() {
  try {
    config = await getConfig();
  } catch {
    // extension context may be invalidated
  }
}

function ensureMount(): HTMLDivElement {
  if (rootHost?.isConnected && shadowMount) return shadowMount;

  rootHost = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (!rootHost) {
    rootHost = document.createElement('div');
    rootHost.id = ROOT_ID;
    rootHost.style.setProperty('all', 'initial', 'important');
    rootHost.style.setProperty('position', 'fixed', 'important');
    rootHost.style.setProperty('z-index', '2147483647', 'important');
    rootHost.style.setProperty('left', '0', 'important');
    rootHost.style.setProperty('top', '0', 'important');
    rootHost.style.setProperty('width', '0', 'important');
    rootHost.style.setProperty('height', '0', 'important');
    rootHost.style.setProperty('overflow', 'visible', 'important');
    document.documentElement.appendChild(rootHost);
  }

  let shadow = rootHost.shadowRoot;
  if (!shadow) {
    shadow = rootHost.attachShadow({ mode: 'open' });
  }

  shadowMount = shadow.getElementById('stitch-mount') as HTMLDivElement | null;
  if (!shadowMount) {
    shadowMount = document.createElement('div');
    shadowMount.id = 'stitch-mount';
    shadowMount.style.cssText =
      'position:fixed;inset:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:2147483647;';
    shadow.appendChild(shadowMount);
  }

  return shadowMount;
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

function isEventInRoot(e: Event): boolean {
  const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
  if (rootHost && path.includes(rootHost)) return true;
  const target = e.target;
  if (target instanceof Node && rootHost?.contains(target)) return true;
  return false;
}

function showFab(x: number, y: number) {
  if (config && config.showFloatingButton === false) return;

  const mount = ensureMount();
  removeFab();

  const left = Math.min(Math.max(8, x), window.innerWidth - 40);
  const top = Math.min(Math.max(8, y), window.innerHeight - 40);

  fab = document.createElement('button');
  fab.id = FAB_ID;
  fab.type = 'button';
  fab.title = 'Stitch Translate 翻译缝合怪';
  fab.style.cssText = `
    all: initial;
    position: fixed;
    left: ${left}px;
    top: ${top}px;
    width: 32px;
    height: 32px;
    border-radius: 9999px;
    background: #ffffff;
    border: 1px solid #c2c6d6;
    cursor: pointer;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    pointer-events: auto;
    user-select: none;
    overflow: hidden;
  `;

  const icon = document.createElement('img');
  icon.alt = 'Stitch Translate 翻译缝合怪';
  icon.width = 20;
  icon.height = 20;
  icon.draggable = false;
  icon.src = chrome.runtime.getURL('public/icons/icon32.png');
  icon.style.cssText =
    'width:20px;height:20px;display:block;pointer-events:none;object-fit:contain;';
  fab.appendChild(icon);

  fab.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  fab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    void openPanel();
  });

  mount.appendChild(fab);
}

function firstEnabledAiPrompt(cfg: AppConfig | null): string {
  if (!cfg) return DEFAULT_AI_PROMPT;
  for (const item of cfg.engineOrder) {
    if (!item.enabled || isBuiltinEngine(item.id)) continue;
    const profile = cfg.aiProfiles?.find((p) => p.id === item.id);
    if (profile?.prompt?.trim()) return profile.prompt;
  }
  const any = cfg.aiProfiles?.find((p) => p.prompt?.trim());
  return any?.prompt || DEFAULT_AI_PROMPT;
}

async function openPanel(options?: {
  text?: string;
  x?: number;
  y?: number;
}) {
  await loadConfig();

  const text = (options?.text ?? lastSelectedText).trim();
  if (!text) return;

  const x =
    options?.x ??
    (lastRect ? lastRect.right + 8 : lastPointer.x + 8);
  const y =
    options?.y ??
    (lastRect ? lastRect.bottom + 8 : lastPointer.y + 8);

  closePanel();
  removeFab();

  const mount = ensureMount();
  panelHost = createPanelHost();
  panelHost.style.pointerEvents = 'auto';
  mount.appendChild(panelHost);

  const sourceLang = config?.autoDetect ? 'auto' : config?.sourceLang ?? 'auto';
  const targetLang = config?.targetLang ?? 'zh-CN';
  const initialPrompt = firstEnabledAiPrompt(config);

  const runTranslate = async (params?: PanelTranslateParams) => {
    if (!panelCtrl) return;
    const p = params ?? panelCtrl.getParams();
    panelCtrl.setLoading();
    try {
      // Always pull latest config inside background TRANSLATE
      const res = await requestTranslate(
        text,
        p.sourceLang,
        p.targetLang,
        p.promptOverride,
      );
      if (!panelCtrl) return;
      if (!res.ok && res.error && !res.results?.length) {
        panelCtrl.setError(res.error);
        return;
      }
      panelCtrl.setResults(res.results ?? [], res.sourceLang, res.targetLang);
    } catch (err) {
      panelCtrl?.setError(err instanceof Error ? err.message : String(err));
    }
  };

  panelCtrl = renderPanel(panelHost, x, y, {
    sourceLang,
    targetLang,
    uiLang: config?.uiLang ?? 'zh',
    initialPrompt,
    anchorTop: lastRect?.top,
    onClose: closePanel,
    onRetranslate: (params) => {
      void runTranslate(params);
    },
  });

  await runTranslate({
    // Empty override → each AI model uses its own prompt from settings
    promptOverride: '',
    sourceLang,
    targetLang,
  });
}

function selectionRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  try {
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) return rect;
  } catch {
    // ignore
  }
  return null;
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
    if (el?.closest?.(`#${ROOT_ID}`)) return;
    const rootNode = anchor.getRootNode();
    if (
      rootHost &&
      rootNode instanceof ShadowRoot &&
      rootNode.host === rootHost
    ) {
      return;
    }
  }

  lastSelectedText = text;
  lastRect = selectionRect();

  if (panelHost) return;

  const x = lastRect ? lastRect.right + 8 : lastPointer.x + 12;
  const y = lastRect ? Math.max(8, lastRect.top - 4) : lastPointer.y + 12;
  showFab(x, y);
}

/** Show FAB 200ms after pointer release (mouseup / keyboard selection end) */
function scheduleFabAfterSelectionEnd() {
  if (primaryPointerDown) return;

  cancelFabShowTimer();

  fabShowTimer = window.setTimeout(() => {
    fabShowTimer = null;
    if (primaryPointerDown) return;
    handleSelection();
  }, FAB_SHOW_DELAY_MS);
}

function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  lastPointer = { x: e.clientX, y: e.clientY };
  if (isEventInRoot(e)) return;

  primaryPointerDown = true;
  hideFabWhileSelecting();
  closePanel();
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  lastPointer = { x: e.clientX, y: e.clientY };
  if (isEventInRoot(e)) return;

  primaryPointerDown = false;
  scheduleFabAfterSelectionEnd();
}

function onPointerCancel(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  primaryPointerDown = false;
  hideFabWhileSelecting();
}

function onPointerMove(e: PointerEvent) {
  if (!(e.buttons & 1)) return;
  primaryPointerDown = true;
  hideFabWhileSelecting();
}

function onSelectionChange() {
  if (primaryPointerDown) hideFabWhileSelecting();
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    cancelFabShowTimer();
    closePanel();
    removeFab();
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (primaryPointerDown) return;
  if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
    scheduleFabAfterSelectionEnd();
  }
}

onConfigChanged((cfg) => {
  config = cfg;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'OPEN_TRANSLATE_PANEL') {
    const text = String(message.text || '').trim();
    if (text) {
      lastSelectedText = text;
      lastRect = selectionRect();
      void openPanel({
        text,
        x: lastRect ? lastRect.right + 8 : window.innerWidth / 2 - 180,
        y: lastRect ? lastRect.bottom + 8 : 120,
      });
    }
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === 'CONFIG_UPDATED') {
    void loadConfig();
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

void loadConfig();

window.addEventListener('pointerdown', onPointerDown, true);
window.addEventListener('pointerup', onPointerUp, true);
window.addEventListener('pointercancel', onPointerCancel, true);
window.addEventListener('pointermove', onPointerMove, true);
document.addEventListener('selectionchange', onSelectionChange);
document.addEventListener('keyup', onKeyUp, true);
document.addEventListener('keydown', onKeyDown, true);
