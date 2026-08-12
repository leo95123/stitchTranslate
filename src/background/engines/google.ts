import type { EngineResult, TranslateParams } from './types';

/** Map UI lang codes to Google Translate codes */
function toGoogleLang(code: string): string {
  if (code === 'auto') return 'auto';
  if (code === 'zh-CN') return 'zh-CN';
  if (code === 'zh-TW') return 'zh-TW';
  return code;
}

export async function translateGoogle(params: TranslateParams): Promise<EngineResult> {
  const { text, sourceLang, targetLang } = params;
  const sl = toGoogleLang(sourceLang);
  const tl = toGoogleLang(targetLang);

  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', sl);
  url.searchParams.set('tl', tl);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google Translate HTTP ${res.status}`);
  }

  const data = (await res.json()) as unknown[];
  // Response: [[[translated, original, ...], ...], null, detectedLang]
  const segments = data[0] as Array<[string, ...unknown[]]> | undefined;
  if (!segments?.length) {
    throw new Error('Empty Google Translate response');
  }

  const translated = segments.map((seg) => seg[0]).join('');
  const detected = typeof data[2] === 'string' ? data[2] : undefined;

  return {
    text: translated,
    detectedSourceLang: detected,
  };
}
