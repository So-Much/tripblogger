import sanitizeHtml from 'sanitize-html';

const POST_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img', 'span']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height'],
    a: ['href', 'name', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

const PRODUCT_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
};

/** Rich post body: keep formatting, drop scripts/handlers. */
export function sanitizePostHtml(raw: string): string {
  return sanitizeHtml(raw, POST_SANITIZE);
}

/** Product description: short allow-list, no headings/images. */
export function sanitizeProductHtml(html: string): string {
  return sanitizeHtml(html, PRODUCT_SANITIZE).trim();
}

/** Comments, reviews, display names: no tags at all. */
export function sanitizePlainText(raw: string | null | undefined): string {
  return sanitizeHtml(raw ?? '', { allowedTags: [], allowedAttributes: {} }).trim();
}
