export type BuildTripBlogInput = {
  destinationName: string;
  days: {
    dayNumber: number;
    date: string;
    blocks: { name: string; status: string; note: string | null }[];
  }[];
  unscheduled: { name: string; status: string }[];
};

export function buildTripBlogHtml(input: BuildTripBlogInput): string {
  const parts: string[] = [];
  parts.push(`<p>Nhật ký chuyến đi <strong>${escapeHtml(input.destinationName)}</strong>.</p>`);

  for (const day of input.days) {
    parts.push(`<h2>Ngày ${day.dayNumber} — ${escapeHtml(day.date)}</h2>`);
    if (!day.blocks.length) {
      parts.push('<p><em>Chưa có điểm nào trong ngày này.</em></p>');
      continue;
    }
    parts.push('<ul>');
    for (const b of day.blocks) {
      const done = b.status === 'DONE' ? ' ✓' : '';
      parts.push(`<li><strong>${escapeHtml(b.name)}</strong>${done}`);
      if (b.note) parts.push(` — ${escapeHtml(b.note)}`);
      parts.push('</li>');
    }
    parts.push('</ul>');
  }

  if (input.unscheduled.length) {
    parts.push('<h2>Chưa xếp lịch</h2><ul>');
    for (const b of input.unscheduled) {
      parts.push(`<li>${escapeHtml(b.name)}</li>`);
    }
    parts.push('</ul>');
  }

  return parts.join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
