import type { AiProfile } from './types';
import { DEFAULT_AI_ENDPOINT, DEFAULT_AI_PROMPT } from './types';
import { getLangName } from './i18n-langs';
import { hasHostPermission } from './host-permission';

export interface AiTranslateParams {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface AiTranslateResult {
  text: string;
}

function langLabel(code: string): string {
  if (code === 'auto') return 'auto';
  return getLangName(code, 'zh');
}

function parseHeaders(headersJson: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const raw = headersJson?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            headers[k] = String(v);
          }
        }
      }
    } catch {
      throw new Error('Header JSON 格式无效');
    }
  }

  const hasAuth = Object.keys(headers).some((k) => k.toLowerCase() === 'authorization');
  if (apiKey.trim() && !hasAuth) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  return headers;
}

function buildPrompt(template: string, params: AiTranslateParams): string {
  const source = langLabel(params.sourceLang);
  const target = langLabel(params.targetLang);
  const tpl = template?.trim() || DEFAULT_AI_PROMPT;
  let filled = tpl
    .replace(/\{\{source\}\}/gi, source)
    .replace(/\{\{target\}\}/gi, target)
    .replace(/\{\{text\}\}/gi, params.text);

  if (!/\{\{text\}\}/i.test(tpl)) {
    filled = `${filled}\n\n${params.text}`;
  }

  return filled;
}

function extractContent(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;

  const choices = d.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const c0 = choices[0] as Record<string, unknown>;
    const message = c0.message;
    if (message && typeof message === 'object') {
      const content = (message as Record<string, unknown>).content;
      if (typeof content === 'string' && content.trim()) return content.trim();
      if (Array.isArray(content)) {
        const parts = content
          .map((p) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object' && typeof (p as { text?: string }).text === 'string') {
              return (p as { text: string }).text;
            }
            return '';
          })
          .join('');
        if (parts.trim()) return parts.trim();
      }
    }
    if (typeof c0.text === 'string' && c0.text.trim()) return c0.text.trim();
  }

  if (typeof d.output_text === 'string' && d.output_text.trim()) return d.output_text.trim();
  if (typeof d.result === 'string' && d.result.trim()) return d.result.trim();
  if (typeof d.content === 'string' && d.content.trim()) return d.content.trim();
  if (typeof d.response === 'string' && d.response.trim()) return d.response.trim();

  return undefined;
}

export function normalizeAiProfileForRequest(profile: AiProfile): AiProfile {
  const endpoint = (profile.endpoint || '').trim().replace(/\/$/, '');
  return {
    id: profile.id || 'test',
    name: profile.name?.trim() || 'AI',
    prompt: profile.prompt?.trim() || DEFAULT_AI_PROMPT,
    model: profile.model?.trim() || 'gpt-4o',
    apiKey: profile.apiKey || '',
    endpoint: endpoint || DEFAULT_AI_ENDPOINT,
    headers: profile.headers || '',
  };
}

/** Call OpenAI-compatible chat/completions. Runs in options page or service worker. */
export async function translateAi(
  params: AiTranslateParams,
  profile: AiProfile,
): Promise<AiTranslateResult> {
  const p = normalizeAiProfileForRequest(profile);

  if (!p.apiKey.trim()) {
    throw new Error(`AI「${p.name}」未配置 API Key`);
  }
  if (!/^https?:\/\//i.test(p.endpoint)) {
    throw new Error(`AI「${p.name}」接口地址无效，需为 http(s) 完整 URL`);
  }

  if (!(await hasHostPermission(p.endpoint))) {
    throw new Error(
      `AI「${p.name}」尚未授权访问该接口域名。请在选项页保存配置或点击「测试接口」时允许网站访问权限。`,
    );
  }

  const headers = parseHeaders(p.headers, p.apiKey);
  const userContent = buildPrompt(p.prompt, params);

  let res: Response;
  try {
    res = await fetch(p.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: p.model,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional translator. Return ONLY the translated text with no quotes, labels, or explanations.',
          },
          { role: 'user', content: userContent },
        ],
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${p.name}: 网络请求失败（${msg}）。请检查接口地址与扩展 host 权限。`);
  }

  const rawText = await res.text();
  let data: unknown;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(
      `${p.name}: HTTP ${res.status}，返回非 JSON：${rawText.slice(0, 200) || '(空)'}`,
    );
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    if (data && typeof data === 'object') {
      const errObj = data as { error?: { message?: string } | string; message?: string };
      if (typeof errObj.error === 'string') detail = errObj.error;
      else if (errObj.error && typeof errObj.error === 'object' && errObj.error.message) {
        detail = errObj.error.message;
      } else if (typeof errObj.message === 'string') {
        detail = errObj.message;
      }
    }
    throw new Error(`${p.name}: ${detail}`);
  }

  const content = extractContent(data);
  if (!content) {
    throw new Error(`${p.name}: 无法解析译文。返回：${rawText.slice(0, 300) || '(空)'}`);
  }

  return { text: content };
}
