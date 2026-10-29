import { categoryFromDbTypeCode, classifyOsmTags } from './poi-categories';

describe('classifyOsmTags', () => {
  it('maps cafe amenity', () => {
    expect(classifyOsmTags({ amenity: 'cafe' })).toBe('cafe');
  });

  it('maps museum tourism to attraction', () => {
    expect(classifyOsmTags({ tourism: 'museum' })).toBe('attraction');
  });

  it('maps core location type codes used by the seed', () => {
    expect(categoryFromDbTypeCode('restaurant')).toBe('restaurant');
    expect(categoryFromDbTypeCode('food')).toBe('restaurant');
    expect(categoryFromDbTypeCode('cafe')).toBe('cafe');
    expect(categoryFromDbTypeCode('accommodation')).toBe('hotel');
    expect(categoryFromDbTypeCode('nature')).toBe('attraction');
    expect(categoryFromDbTypeCode('outdoor')).toBe('other');
    expect(categoryFromDbTypeCode(null)).toBe('other');
  });

  it('returns other when no known tag', () => {
    expect(classifyOsmTags({})).toBe('other');
    expect(classifyOsmTags({ amenity: 'bench' })).toBe('other');
  });
});
