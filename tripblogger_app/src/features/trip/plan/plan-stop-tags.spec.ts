import { PLAN_HIDDEN_STOP_TAGS, visibleStopTags } from './plan-stop-tags';

describe('plan-stop-tags', () => {
  it('filters hidden system tags from display', () => {
    expect(visibleStopTags(['entry_point', 'accommodation', 'vegan'])).toEqual([
      'accommodation',
      'vegan',
    ]);
  });

  it('marks entry_point as hidden', () => {
    expect(PLAN_HIDDEN_STOP_TAGS.has('entry_point')).toBe(true);
  });
});
