import type { AiConfig } from '../../shared/types';
import type { EngineResult, TranslateParams } from './types';
import { getLangName } from '../../shared/i18n-langs';

function langLabel(code: string): string {
  if (code === 'auto') return 'the source language (auto-detect)';
  return getLangName(code);
}

export async function translateAi(
  params: TranslateParams,
  ai: AiConfig,
): Promise<EngineResult> {
  if (!ai.apiKey?.trim()) {
    throw new Error('AI API Key 未配置，请在选项页填写');
  }

  const endpoint = (ai.endpoint || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = ai.model || 'gpt-4o';

  const system = [
    'You are a professional translator.',
    'Translate the user text accurately.',
    'Return ONLY the translated text with no quotes, labels, or explanations.',
  ].join(' ');

  const user = `Translate the following text from ${langLabel(params.sourceLang)} to ${langLabel(params.targetLang)}:\n\n${params.text}`;

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ai.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      if (errBody.error?.message) detail = errBody.error.message;
    } catch {
      // ignore
    }
    throw new Error(`AI Translate: ${detail}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('AI 返回空结果');
  }

  return { text: content };
}
