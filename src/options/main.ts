import './style.css';
import type { AppConfig, EngineId } from '../shared/types';
import { ENGINE_META } from '../shared/types';
import { sendMessage } from '../shared/messages';
import { exportConfigJson, importConfigJson } from '../shared/storage';

const aiModel = document.getElementById('ai-model') as HTMLInputElement;
const aiKey = document.getElementById('ai-key') as HTMLInputElement;
const aiEndpoint = document.getElementById('ai-endpoint') as HTMLInputElement;
const optAutoDetect = document.getElementById('opt-auto-detect') as HTMLInputElement;
const optShowFab = document.getElementById('opt-show-fab') as HTMLInputElement;
const engineList = document.getElementById('engine-list') as HTMLUListElement;
const saveStatus = document.getElementById('save-status') as HTMLSpanElement;
const importFile = document.getElementById('import-file') as HTMLInputElement;

let config: AppConfig | null = null;
let dragFrom: number | null = null;

function engineLabel(id: EngineId): string {
  return ENGINE_META[id].label;
}

function renderEngines() {
  if (!config) return;
  engineList.innerHTML = '';

  config.engineOrder.forEach((item, index) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.index = String(index);
    li.className = `flex items-center justify-between p-md bg-surface border border-outline-variant rounded-lg cursor-grab hover:bg-surface-container-low transition-colors ${
      item.enabled ? 'shadow-sm' : 'opacity-60'
    }`;

    li.innerHTML = `
      <div class="flex items-center gap-md">
        <span class="material-symbols-outlined text-on-surface-variant">drag_indicator</span>
        <span class="text-label-md text-on-surface">${engineLabel(item.id)}</span>
      </div>
      <button type="button" data-toggle="${index}" class="material-symbols-outlined ${
        item.enabled ? 'text-primary' : 'text-on-surface-variant'
      } text-[20px]" title="${item.enabled ? '禁用' : '启用'}">
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
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragFrom === null || !config) return;
      const to = index;
      if (dragFrom === to) return;
      const order = [...config.engineOrder];
      const [moved] = order.splice(dragFrom, 1);
      order.splice(to, 0, moved);
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

function readFormIntoConfig() {
  if (!config) return;
  config = {
    ...config,
    autoDetect: optAutoDetect.checked,
    showFloatingButton: optShowFab.checked,
    ai: {
      apiKey: aiKey.value.trim(),
      endpoint: aiEndpoint.value.trim() || 'https://api.openai.com/v1',
      model: aiModel.value.trim() || 'gpt-4o',
    },
  };
}

function fillForm(cfg: AppConfig) {
  config = structuredClone(cfg);
  aiModel.value = cfg.ai.model;
  aiKey.value = cfg.ai.apiKey;
  aiEndpoint.value = cfg.ai.endpoint;
  optAutoDetect.checked = cfg.autoDetect;
  optShowFab.checked = cfg.showFloatingButton;
  renderEngines();
}

async function save() {
  if (!config) return;
  readFormIntoConfig();
  const res = await sendMessage<{ ok: boolean; error?: string }>({
    type: 'SAVE_CONFIG',
    config,
  });
  if (res.ok) {
    saveStatus.textContent = '已保存';
    setTimeout(() => {
      saveStatus.textContent = '';
    }, 2000);
  } else {
    saveStatus.textContent = res.error || '保存失败';
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

async function init() {
  const res = await sendMessage<{ ok: boolean; config: AppConfig }>({ type: 'GET_CONFIG' });
  fillForm(res.config);

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
    try {
      const text = await file.text();
      const imported = importConfigJson(text);
      fillForm(imported);
      saveStatus.textContent = '已导入，请点击 Save Changes';
    } catch (err) {
      saveStatus.textContent = err instanceof Error ? err.message : '导入失败';
    } finally {
      importFile.value = '';
    }
  });
}

void init();
