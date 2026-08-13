import './style.css';
import type { AppConfig, AiProfile, UiLang } from '../shared/types';
import {
  createAiProfile,
  DEFAULT_AI_PROMPT,
  DEFAULT_AI_ENDPOINT,
  isBuiltinEngine,
} from '../shared/types';
import { sendMessage } from '../shared/messages';
import { exportConfigJson, importConfigJson, normalizeConfig, getConfig, saveConfig } from '../shared/storage';
import {
  ensureAiEndpointPermissions,
  ensureHostPermission,
} from '../shared/host-permission';
import { applyDomI18n, engineDisplayName, t } from '../shared/ui-i18n';
import { translateAi } from '../shared/ai-client';

type PageId = 'engines' | 'ai' | 'language' | 'advanced' | 'export';

const PAGE_META: Record<PageId, { title: string; subtitle: string }> = {
  engines: { title: 'engine.title', subtitle: 'engine.hint' },
  ai: { title: 'ai.title', subtitle: 'ai.subtitle' },
  language: { title: 'options.uiLang', subtitle: 'options.uiLang.hint' },
  advanced: { title: 'advanced.title', subtitle: 'options.subtitle' },
  export: { title: 'export.title', subtitle: 'export.hint' },
};

const optAutoDetect = document.getElementById('opt-auto-detect') as HTMLInputElement;
const optShowFab = document.getElementById('opt-show-fab') as HTMLInputElement;
const uiLangSelect = document.getElementById('ui-lang') as HTMLSelectElement;
const engineList = document.getElementById('engine-list') as HTMLUListElement;
const aiList = document.getElementById('ai-list') as HTMLDivElement;
const aiEmpty = document.getElementById('ai-empty') as HTMLParagraphElement;
const saveStatus = document.getElementById('save-status') as HTMLSpanElement;
const importFile = document.getElementById('import-file') as HTMLInputElement;
const pageTitle = document.getElementById('page-title') as HTMLHeadingElement;
const pageSubtitle = document.getElementById('page-subtitle') as HTMLParagraphElement;

let config: AppConfig | null = null;
let dragFrom: number | null = null;
let currentPage: PageId = 'engines';

function currentUiLang(): UiLang {
  return config?.uiLang ?? 'zh';
}

function engineLabel(id: string): string {
  const lang = currentUiLang();
  if (isBuiltinEngine(id)) return engineDisplayName(lang, id);
  return config?.aiProfiles?.find((p) => p.id === id)?.name ?? id;
}

function ensureConfigShape() {
  if (!config) return;
  config = normalizeConfig(config);
}

function setNavActive(page: PageId) {
  document.querySelectorAll<HTMLButtonElement>('.nav-item').forEach((btn) => {
    const active = btn.dataset.page === page;
    btn.classList.toggle('bg-secondary-container', active);
    btn.classList.toggle('text-on-secondary-container', active);
    btn.classList.toggle('font-bold', active);
    btn.classList.toggle('text-on-surface-variant', !active);
    btn.classList.toggle('hover:bg-surface-container-high', !active);
  });
}

function showPage(page: PageId) {
  currentPage = page;
  saveStatus.textContent = '';
  (['engines', 'ai', 'language', 'advanced', 'export'] as const).forEach((id) => {
    const el = document.getElementById(`page-${id}`);
    if (!el) return;
    el.classList.toggle('hidden', id !== page);
  });
  setNavActive(page);
  const meta = PAGE_META[page];
  pageTitle.dataset.i18n = meta.title;
  pageSubtitle.dataset.i18n = meta.subtitle;
  pageTitle.textContent = t(currentUiLang(), meta.title);
  pageSubtitle.textContent = t(currentUiLang(), meta.subtitle);
  applyDomI18n(document, currentUiLang());
}

function refreshI18n() {
  applyDomI18n(document, currentUiLang());
  renderEngines();
  renderAiProfiles();
  showPage(currentPage);
}

function renderEngines() {
  if (!config) return;
  ensureConfigShape();
  const lang = currentUiLang();
  engineList.innerHTML = '';

  config.engineOrder.forEach((item, index) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.className = `flex items-center justify-between p-md bg-surface border border-outline-variant rounded-lg cursor-grab hover:bg-surface-container-low transition-colors ${
      item.enabled ? 'shadow-sm' : 'opacity-60'
    }`;

    const icon = isBuiltinEngine(item.id)
      ? item.id === 'google'
        ? 'g_translate'
        : 'translate'
      : 'smart_toy';

    li.innerHTML = `
      <div class="flex items-center gap-md min-w-0">
        <span class="material-symbols-outlined text-on-surface-variant shrink-0">drag_indicator</span>
        <span class="material-symbols-outlined text-primary shrink-0 text-[20px]">${icon}</span>
        <span class="text-label-md text-on-surface truncate">${escapeHtml(engineLabel(item.id))}</span>
      </div>
      <button type="button" data-toggle="${index}" class="material-symbols-outlined ${
        item.enabled ? 'text-primary' : 'text-on-surface-variant'
      } text-[20px] shrink-0" title="${item.enabled ? t(lang, 'engine.disable') : t(lang, 'engine.enable')}">
        ${item.enabled ? 'visibility' : 'visibility_off'}
      </button>
    `;

    li.addEventListener('dragstart', () => {
      dragFrom = index;
      li.classList.add('opacity-50');
    });
    li.addEventListener('dragend', () => {
      dragFrom = null;
      li.classList.remove('opacity-50');
    });
    li.addEventListener('dragover', (e) => e.preventDefault());
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragFrom === null || !config) return;
      if (dragFrom === index) return;
      const order = [...config.engineOrder];
      const [moved] = order.splice(dragFrom, 1);
      order.splice(index, 0, moved);
      config.engineOrder = order;
      renderEngines();
    });

    li.querySelector<HTMLButtonElement>('[data-toggle]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!config) return;
      config.engineOrder[index] = {
        ...config.engineOrder[index],
        enabled: !config.engineOrder[index].enabled,
      };
      renderEngines();
    });

    engineList.appendChild(li);
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function syncAiFromDom() {
  if (!config) return;
  ensureConfigShape();
  const cards = aiList.querySelectorAll<HTMLElement>('[data-ai-id]');
  const next: AiProfile[] = [];
  cards.forEach((card) => {
    const id = card.dataset.aiId!;
    const existing = config!.aiProfiles?.find((p) => p.id === id);
    next.push({
      id,
      name:
        (card.querySelector<HTMLInputElement>('[data-field="name"]')?.value || '').trim() ||
        existing?.name ||
        'AI Model',
      prompt:
        card.querySelector<HTMLTextAreaElement>('[data-field="prompt"]')?.value ||
        DEFAULT_AI_PROMPT,
      model:
        (card.querySelector<HTMLInputElement>('[data-field="model"]')?.value || '').trim() ||
        'gpt-4o',
      apiKey: card.querySelector<HTMLInputElement>('[data-field="apiKey"]')?.value || '',
      endpoint:
        (card.querySelector<HTMLInputElement>('[data-field="endpoint"]')?.value || '').trim() ||
        DEFAULT_AI_ENDPOINT,
      headers: card.querySelector<HTMLTextAreaElement>('[data-field="headers"]')?.value || '',
    });
  });
  config.aiProfiles = next;
}

function renderAiProfiles() {
  if (!config) return;
  ensureConfigShape();
  const lang = currentUiLang();
  aiList.innerHTML = '';
  aiEmpty.classList.toggle('hidden', config.aiProfiles.length > 0);

  config.aiProfiles.forEach((profile) => {
    const card = document.createElement('div');
    card.dataset.aiId = profile.id;
    card.className =
      'bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant space-y-md w-[340px] shrink-0';

    card.innerHTML = `
      <div class="flex items-center justify-between gap-md">
        <h3 class="text-headline-sm text-on-surface truncate">${escapeHtml(profile.name)}</h3>
        <button type="button" data-delete class="text-error text-label-md hover:underline shrink-0">${t(lang, 'ai.delete')}</button>
      </div>
      <div class="flex flex-col gap-md">
        <div>
          <label class="block text-label-md text-on-surface-variant mb-xs">${t(lang, 'ai.name')}</label>
          <input data-field="name" class="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" type="text" value="${escapeHtml(profile.name)}" />
        </div>
        <div>
          <label class="block text-label-md text-on-surface-variant mb-xs">${t(lang, 'ai.model')}</label>
          <input data-field="model" class="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" type="text" value="${escapeHtml(profile.model)}" />
        </div>
        <div>
          <label class="block text-label-md text-on-surface-variant mb-xs">${t(lang, 'ai.key')}</label>
          <input data-field="apiKey" class="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" type="password" value="${escapeHtml(profile.apiKey)}" />
        </div>
        <div>
          <label class="block text-label-md text-on-surface-variant mb-xs">${t(lang, 'ai.endpoint')}</label>
          <input data-field="endpoint" class="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" type="url" placeholder="${escapeHtml(t(lang, 'ai.endpoint.placeholder'))}" value="${escapeHtml(profile.endpoint)}" />
          <p class="text-body-sm text-on-surface-variant mt-xs">${t(lang, 'ai.endpoint.hint')}</p>
        </div>
        <div>
          <label class="block text-label-md text-on-surface-variant mb-xs">${t(lang, 'ai.prompt')}</label>
          <textarea data-field="prompt" rows="3" class="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">${escapeHtml(profile.prompt)}</textarea>
          <ul class="text-body-sm text-on-surface-variant mt-xs space-y-xs list-disc pl-md">
            <li><code class="text-[12px]">{{source}}</code> — ${lang === 'en' ? 'source language name' : '源语言名称'}</li>
            <li><code class="text-[12px]">{{target}}</code> — ${lang === 'en' ? 'target language name' : '目标语言名称'}</li>
            <li><code class="text-[12px]">{{text}}</code> — ${lang === 'en' ? 'text to translate (auto-appended if omitted)' : '待翻译原文（未填写时自动附在提示词后）'}</li>
          </ul>
        </div>
        <div>
          <label class="block text-label-md text-on-surface-variant mb-xs">${t(lang, 'ai.headers')}</label>
          <textarea data-field="headers" rows="3" placeholder='{"X-Custom-Header":"value"}' class="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono text-[13px]">${escapeHtml(profile.headers)}</textarea>
          <p class="text-body-sm text-on-surface-variant mt-xs">${t(lang, 'ai.headers.hint')}</p>
        </div>
      </div>
      <div class="flex flex-col gap-sm pt-sm border-t border-outline-variant">
        <button type="button" data-test class="inline-flex items-center justify-center gap-xs px-md py-sm rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container-high text-label-md text-on-surface transition-colors">
          <span class="material-symbols-outlined text-[18px]">science</span>
          ${t(lang, 'ai.test')}
        </button>
        <p data-test-status class="text-body-sm text-on-surface-variant hidden whitespace-pre-wrap break-words"></p>
      </div>
    `;

    card.querySelector('[data-delete]')?.addEventListener('click', () => {
      if (!config) return;
      const name = profile.name || 'AI Model';
      const msg =
        lang === 'en'
          ? `Delete model "${name}"? This cannot be undone until you save.`
          : `确定删除模型「${name}」吗？保存前仍可刷新页面撤销。`;
      if (!window.confirm(msg)) return;
      syncAiFromDom();
      config.aiProfiles = config.aiProfiles.filter((p) => p.id !== profile.id);
      config.engineOrder = config.engineOrder.filter((e) => e.id !== profile.id);
      renderAiProfiles();
      renderEngines();
    });

    card.querySelector<HTMLInputElement>('[data-field="name"]')?.addEventListener('change', () => {
      syncAiFromDom();
      renderEngines();
      const title = card.querySelector('h3');
      const nameInput = card.querySelector<HTMLInputElement>('[data-field="name"]');
      if (title && nameInput) title.textContent = nameInput.value || 'AI Model';
    });

    card.querySelector('[data-test]')?.addEventListener('click', () => {
      void testAiCard(card);
    });

    aiList.appendChild(card);
  });
}

function readProfileFromCard(card: HTMLElement): AiProfile {
  const id = card.dataset.aiId || crypto.randomUUID();
  return {
    id,
    name:
      (card.querySelector<HTMLInputElement>('[data-field="name"]')?.value || '').trim() ||
      'AI Model',
    prompt:
      card.querySelector<HTMLTextAreaElement>('[data-field="prompt"]')?.value ||
      DEFAULT_AI_PROMPT,
    model:
      (card.querySelector<HTMLInputElement>('[data-field="model"]')?.value || '').trim() ||
      'gpt-4o',
    apiKey: card.querySelector<HTMLInputElement>('[data-field="apiKey"]')?.value || '',
    endpoint:
      (card.querySelector<HTMLInputElement>('[data-field="endpoint"]')?.value || '').trim() ||
      DEFAULT_AI_ENDPOINT,
    headers: card.querySelector<HTMLTextAreaElement>('[data-field="headers"]')?.value || '',
  };
}

async function testAiCard(card: HTMLElement) {
  const lang = currentUiLang();
  const statusEl = card.querySelector<HTMLElement>('[data-test-status]');
  const btn = card.querySelector<HTMLButtonElement>('[data-test]');
  if (!statusEl || !btn) return;

  const profile = readProfileFromCard(card);

  if (!profile.endpoint.trim()) {
    statusEl.classList.remove('hidden', 'text-primary');
    statusEl.classList.add('text-error');
    statusEl.textContent =
      lang === 'en'
        ? 'Please fill in the full endpoint URL.'
        : '请填写完整接口地址（含 chat/completions）。';
    return;
  }
  if (!/^https?:\/\//i.test(profile.endpoint.trim())) {
    statusEl.classList.remove('hidden', 'text-primary');
    statusEl.classList.add('text-error');
    statusEl.textContent =
      lang === 'en'
        ? 'Endpoint must start with http:// or https://'
        : '接口地址必须以 http:// 或 https:// 开头';
    return;
  }
  if (!profile.apiKey.trim()) {
    statusEl.classList.remove('hidden', 'text-primary');
    statusEl.classList.add('text-error');
    statusEl.textContent =
      lang === 'en' ? 'Please fill in API Key first.' : '请先填写 API Key。';
    return;
  }

  const headersRaw = profile.headers.trim();
  if (headersRaw) {
    try {
      const parsed = JSON.parse(headersRaw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid');
      }
    } catch {
      statusEl.classList.remove('hidden', 'text-primary');
      statusEl.classList.add('text-error');
      statusEl.textContent =
        lang === 'en' ? 'Invalid Headers JSON.' : 'Headers JSON 格式无效。';
      return;
    }
  }

  btn.disabled = true;
  statusEl.classList.remove('hidden', 'text-error', 'text-primary');
  statusEl.classList.add('text-on-surface-variant');
  statusEl.textContent = t(lang, 'ai.testing');

  try {
    const granted = await ensureHostPermission(profile.endpoint);
    if (!granted) {
      throw new Error(
        lang === 'en'
          ? 'Host permission denied. Allow site access to call this API.'
          : '未授予网站访问权限，无法请求该接口。',
      );
    }

    // Call directly from options page so the request appears in this page's Network panel
    const result = await translateAi(
      { text: 'Hello', sourceLang: 'en', targetLang: 'zh-CN' },
      profile,
    );
    statusEl.classList.remove('text-on-surface-variant');
    statusEl.classList.add('text-primary');
    statusEl.textContent = `${t(lang, 'ai.test.ok')}: ${result.text}`;
  } catch (err) {
    statusEl.classList.remove('text-on-surface-variant');
    statusEl.classList.add('text-error');
    statusEl.textContent = `${t(lang, 'ai.test.fail')}: ${
      err instanceof Error ? err.message : String(err)
    }`;
  } finally {
    btn.disabled = false;
  }
}

function readFormIntoConfig() {
  if (!config) return;
  syncAiFromDom();
  ensureConfigShape();
  config = {
    ...config,
    uiLang: uiLangSelect.value === 'en' ? 'en' : 'zh',
    autoDetect: optAutoDetect.checked,
    showFloatingButton: optShowFab.checked,
  };
  const ids = new Set(config.engineOrder.map((e) => e.id));
  for (const p of config.aiProfiles) {
    if (!ids.has(p.id)) {
      config.engineOrder.push({ id: p.id, enabled: true });
    }
  }
}

function fillForm(cfg: AppConfig) {
  config = normalizeConfig(cfg);
  uiLangSelect.value = config.uiLang || 'zh';
  optAutoDetect.checked = config.autoDetect;
  optShowFab.checked = config.showFloatingButton;
  refreshI18n();
}

async function save() {
  if (!config) return;
  try {
    readFormIntoConfig();
    ensureConfigShape();
    for (const p of config.aiProfiles) {
      const raw = p.headers.trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('not object');
        }
      } catch {
        saveStatus.textContent =
          currentUiLang() === 'en'
            ? `Invalid headers JSON: ${p.name}`
            : `Headers JSON 无效：${p.name}`;
        showPage('ai');
        return;
      }
    }

    const lang = currentUiLang();
    const perm = await ensureAiEndpointPermissions(config.aiProfiles);
    if (!perm.ok) {
      saveStatus.textContent =
        lang === 'en'
          ? `Permission denied for: ${perm.denied.join(', ')}`
          : `未授权访问：${perm.denied.join('、')}。请在弹窗中允许，否则自定义 AI 无法请求。`;
      showPage('ai');
      // Still save config so settings aren't lost
    }

    // Write storage directly from options page (authoritative), then notify SW
    const saved = await saveConfig(config);
    fillForm(saved);

    try {
      await sendMessage({ type: 'CONFIG_SAVED' });
    } catch {
      // SW may be asleep; storage.onChanged still notifies popup/content
    }

    const aiCount = saved.aiProfiles?.length ?? 0;
    if (perm.ok) {
      saveStatus.textContent =
        lang === 'en'
          ? `Saved (${aiCount} AI model${aiCount === 1 ? '' : 's'})`
          : `已保存（${aiCount} 个 AI 模型）`;
    }
    setTimeout(() => {
      if (perm.ok) saveStatus.textContent = '';
    }, 2500);
  } catch (err) {
    console.error(err);
    saveStatus.textContent = t(currentUiLang(), 'save.fail');
  }
}

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bindUiEvents() {
  document.getElementById('nav-list')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest?.('.nav-item') as
      | HTMLButtonElement
      | null;
    if (!btn) return;
    const page = btn.dataset.page as PageId | undefined;
    if (!page || !(page in PAGE_META)) return;
    syncAiFromDom();
    showPage(page);
  });

  document.getElementById('btn-goto-ai')?.addEventListener('click', () => {
    syncAiFromDom();
    showPage('ai');
  });

  document.getElementById('btn-add-ai')?.addEventListener('click', () => {
    if (!config) return;
    syncAiFromDom();
    const profile = createAiProfile({
      name: currentUiLang() === 'en' ? 'New AI Model' : '新 AI 模型',
    });
    config.aiProfiles.push(profile);
    config.engineOrder.push({ id: profile.id, enabled: true });
    renderAiProfiles();
    renderEngines();
  });

  uiLangSelect.addEventListener('change', () => {
    if (!config) return;
    syncAiFromDom();
    config.uiLang = uiLangSelect.value === 'en' ? 'en' : 'zh';
    refreshI18n();
  });

  document.getElementById('btn-save')?.addEventListener('click', () => {
    void save();
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    if (!config) return;
    readFormIntoConfig();
    downloadJson('stitch-translate-config.json', exportConfigJson(config));
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    const lang = currentUiLang();
    try {
      const text = await file.text();
      fillForm(importConfigJson(text));
      saveStatus.textContent = t(currentUiLang(), 'import.ok');
    } catch (err) {
      saveStatus.textContent = err instanceof Error ? err.message : t(lang, 'import.fail');
    } finally {
      importFile.value = '';
    }
  });
}

async function init() {
  bindUiEvents();
  showPage('engines');

  try {
    fillForm(await getConfig());
  } catch (err) {
    console.error('Failed to load config', err);
    saveStatus.textContent = t(currentUiLang(), 'save.fail');
  }
}

void init();
