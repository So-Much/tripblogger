import { buildTripBlogHtml } from './build-trip-blog-html';

describe('buildTripBlogHtml', () => {
  it('renders days and notes', () => {
    const html = buildTripBlogHtml({
      destinationName: 'Đà Lạt',
      days: [
        {
          dayNumber: 1,
          date: '2026-08-01',
          blocks: [
            { name: 'Hồ Xuân Hương', status: 'DONE', note: 'Đẹp' },
            { name: 'Chợ Đà Lạt', status: 'PLANNED', note: null },
          ],
        },
      ],
      unscheduled: [],
    });
    expect(html).toContain('Đà Lạt');
    expect(html).toContain('Ngày 1');
    expect(html).toContain('Hồ Xuân Hương');
    expect(html).toContain('Đẹp');
    expect(html).toContain('✓');
  });
});
