import type { EngineResult, TranslateParams } from './types';

interface BingToken {
  token: string;
  key: string;
  ig?: string;
  iid?: string;
}

let cachedToken: BingToken | null = null;
let tokenFetchedAt = 0;
const TOKEN_TTL_MS = 5 * 60 * 1000;

function toBingLang(code: string): string {
  if (code === 'auto') return 'auto-detect';
  if (code === 'zh-CN') return 'zh-Hans';
  if (code === 'zh-TW') return 'zh-Hant';
  return code;
}

async function fetchBingToken(): Promise<BingToken> {
  const now = Date.now();
  if (cachedToken && now - tokenFetchedAt < TOKEN_TTL_MS) {
    return cachedToken;
  }

  const res = await fetch('https://www.bing.com/translator');
  if (!res.ok) {
    throw new Error(`Bing translator page HTTP ${res.status}`);
  }
  const html = await res.text();

  const igMatch = html.match(/IG:"([^"]+)"/);
  const iidMatch = html.match(/data-iid="([^"]+)"/);
  const abuseMatch = html.match(/params_AbusePreventionHelper\s*=\s*(\[[^\]]+\])/);

  if (!abuseMatch) {
    throw new Error('Failed to extract Bing abuse prevention token');
  }

  const abuse = JSON.parse(abuseMatch[1]) as [number, string, number];
  cachedToken = {
    key: String(abuse[0]),
    token: abuse[1],
    ig: igMatch?.[1],
    iid: iidMatch?.[1] ?? 'translator.5023',
  };
  tokenFetchedAt = now;
  return cachedToken;
}

interface BingTranslateItem {
  translations?: Array<{ text: string; to: string }>;
  detectedLanguage?: { language: string };
}

export async function translateBing(params: TranslateParams): Promise<EngineResult> {
  const { text, sourceLang, targetLang } = params;
  const token = await fetchBingToken();

  const from = toBingLang(sourceLang);
  const to = toBingLang(targetLang);

  const url = new URL('https://www.bing.com/ttranslatev3');
  url.searchParams.set('isVertical', '1');
  if (token.ig) url.searchParams.set('IG', token.ig);
  if (token.iid) url.searchParams.set('IID', token.iid);

  const body = new URLSearchParams({
    fromLang: from,
    to,
    text,
    token: token.token,
    key: token.key,
  });

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    cachedToken = null;
    throw new Error(`Bing Translate HTTP ${res.status}`);
  }

  const data = (await res.json()) as BingTranslateItem[] | { statusCode?: number };
  if (!Array.isArray(data) || !data[0]) {
    cachedToken = null;
    throw new Error('Invalid Bing Translate response');
  }

  const item = data[0];
  const translated = item.translations?.[0]?.text;
  if (!translated) {
    throw new Error('Empty Bing Translate result');
  }

  return {
    text: translated,
    detectedSourceLang: item.detectedLanguage?.language,
  };
}
