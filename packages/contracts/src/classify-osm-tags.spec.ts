import { classifyOsmTags } from './poi-categories';

describe('classifyOsmTags', () => {
  it('maps cafe amenity', () => {
    expect(classifyOsmTags({ amenity: 'cafe' })).toBe('cafe');
  });

  it('maps museum tourism to attraction', () => {
    expect(classifyOsmTags({ tourism: 'museum' })).toBe('attraction');
  });

  it('returns other when no known tag', () => {
    expect(classifyOsmTags({})).toBe('other');
    expect(classifyOsmTags({ amenity: 'bench' })).toBe('other');
  });
});
