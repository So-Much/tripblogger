const TAG_BODY = /^[A-Za-z0-9_]{1,32}$/;
const HASHTAG_PARAGRAPH =
  /<p>\s*((?:#[A-Za-z0-9_]+\s*)+)\s*<\/p>\s*$/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normalizeTagName(raw: string): string | null {
  const body = raw.replace(/^#+/, '').trim();
  if (!body || !TAG_BODY.test(body)) return null;
  return body;
}

export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const normalized = normalizeTagName(tag);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

export function stripTrailingHashtagBlock(contentHtml: string): string {
  const trimmed = contentHtml.trim();
  if (!trimmed) return '';
  const withoutHtmlPara = trimmed.replace(HASHTAG_PARAGRAPH, '').trimEnd();
  const plainTail = /\s((?:#[A-Za-z0-9_]+\s*)+)$/;
  return withoutHtmlPara.replace(plainTail, '').trimEnd();
}

export function parseTagsFromContentHtml(contentHtml: string): string[] {
  const match = contentHtml.trim().match(/((?:#[A-Za-z0-9_]+\s*)+)$/);
  if (!match) return [];
  const tokens = match[1].match(/#[A-Za-z0-9_]+/g) ?? [];
  return dedupeTags(tokens);
}

/** Plain text for UI when tags are shown as chips (avoids duplicate hashtag tail). */
export function getPostBodyPlainText(contentHtml: string, tags?: string[]): string {
  const html = tags?.length ? stripTrailingHashtagBlock(contentHtml) : contentHtml;
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mergeHashtagsIntoContentHtml(contentHtml: string, tags: string[]): string {
  const normalized = dedupeTags(tags);
  if (!normalized.length) return contentHtml.trim();
  const base = stripTrailingHashtagBlock(contentHtml);
  const hashLine = normalized.map((t) => `#${t}`).join(' ');
  const block = `<p>${escapeHtml(hashLine)}</p>`;
  return base ? `${base}\n${block}` : block;
}
