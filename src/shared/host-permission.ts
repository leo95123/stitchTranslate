import type { AiProfile } from './types';

/** Origins already covered by required host_permissions in manifest */
const BUILTIN_HOST_SUFFIXES = [
  'translate.googleapis.com',
  'translate.google.com',
  'www.bing.com',
  'api.cognitive.microsofttranslator.com',
  'microsofttranslator.com',
  'api.openai.com',
];

export function originPatternFromUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return `${u.protocol}//${u.host}/*`;
  } catch {
    return null;
  }
}

function isBuiltinHost(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return BUILTIN_HOST_SUFFIXES.some(
      (s) => host === s || host.endsWith(`.${s}`),
    );
  } catch {
    return false;
  }
}

export async function hasHostPermission(url: string): Promise<boolean> {
  if (isBuiltinHost(url)) return true;
  const pattern = originPatternFromUrl(url);
  if (!pattern) return false;
  try {
    return await chrome.permissions.contains({ origins: [pattern] });
  } catch {
    return false;
  }
}

/**
 * Request optional host permission for a custom AI endpoint.
 * Must be called from a user gesture (options / popup click).
 */
export async function ensureHostPermission(url: string): Promise<boolean> {
  if (await hasHostPermission(url)) return true;
  const pattern = originPatternFromUrl(url);
  if (!pattern) return false;
  try {
    return await chrome.permissions.request({ origins: [pattern] });
  } catch {
    return false;
  }
}

/** Request permissions for all AI profile endpoints (deduped). */
export async function ensureAiEndpointPermissions(
  profiles: AiProfile[],
): Promise<{ ok: boolean; denied: string[] }> {
  const seen = new Set<string>();
  const denied: string[] = [];

  for (const profile of profiles) {
    const endpoint = profile.endpoint?.trim();
    if (!endpoint) continue;
    const pattern = originPatternFromUrl(endpoint);
    if (!pattern || seen.has(pattern)) continue;
    seen.add(pattern);

    const granted = await ensureHostPermission(endpoint);
    if (!granted) {
      denied.push(profile.name?.trim() || endpoint);
    }
  }

  return { ok: denied.length === 0, denied };
}
