import {
  sanitizePlainText,
  sanitizePostHtml,
  sanitizeProductHtml,
} from './html-sanitize';

describe('sanitizePostHtml', () => {
  it('strips script tags and event handlers', () => {
    const dirty =
      '<p>Hi</p><script>alert(1)</script><img src="x" onerror="alert(1)" alt="ok">';
    const clean = sanitizePostHtml(dirty);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onerror/i);
    expect(clean).toContain('<p>Hi</p>');
    expect(clean).toContain('<img');
  });

  it('keeps safe formatting tags', () => {
    const html = '<h1>Title</h1><p><strong>bold</strong> <a href="https://example.com">link</a></p>';
    expect(sanitizePostHtml(html)).toContain('<h1>Title</h1>');
    expect(sanitizePostHtml(html)).toContain('https://example.com');
  });

  it('drops javascript: urls', () => {
    const html = '<a href="javascript:alert(1)">x</a>';
    expect(sanitizePostHtml(html)).not.toMatch(/javascript:/i);
  });
});

describe('sanitizeProductHtml', () => {
  it('strips script and keeps a short allow-list', () => {
    const dirty = '<p>Bag</p><script>x</script><h1>no</h1>';
    const clean = sanitizeProductHtml(dirty);
    expect(clean).toContain('<p>Bag</p>');
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/<h1>/);
  });
});

describe('sanitizePlainText', () => {
  it('strips all tags and trims', () => {
    expect(sanitizePlainText('  <b>Đà Lạt</b><script>x</script>  ')).toBe('Đà Lạt');
  });

  it('returns empty string for empty/whitespace/nullish', () => {
    expect(sanitizePlainText('')).toBe('');
    expect(sanitizePlainText('   ')).toBe('');
    expect(sanitizePlainText(null)).toBe('');
    expect(sanitizePlainText(undefined)).toBe('');
  });
});
