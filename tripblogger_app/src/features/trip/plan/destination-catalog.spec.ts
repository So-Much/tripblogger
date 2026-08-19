import {
  DESTINATION_CATALOG,
  filterDestinationCatalog,
  findCatalogEntry,
  normalizeVi,
} from './destination-catalog';

describe('normalizeVi', () => {
  it('folds Vietnamese diacritics and đ', () => {
    expect(normalizeVi('Đà Lạt')).toBe('da lat');
    expect(normalizeVi('Vịnh Hạ Long')).toBe('vinh ha long');
  });

  it('lowercases and trims', () => {
    expect(normalizeVi('  Nha   Trang ')).toBe('nha trang');
  });
});

describe('DESTINATION_CATALOG', () => {
  it('includes starter destinations with coords', () => {
    const daLat = DESTINATION_CATALOG.find((e) => e.name === 'Đà Lạt');
    expect(daLat).toEqual({ name: 'Đà Lạt', lat: 11.9404, lng: 108.4583 });
    expect(DESTINATION_CATALOG.length).toBeGreaterThanOrEqual(13);
  });
});

describe('filterDestinationCatalog', () => {
  it('matches accent-insensitive substrings', () => {
    expect(filterDestinationCatalog('da l').some((h) => h.name === 'Đà Lạt')).toBe(true);
    expect(filterDestinationCatalog('da').some((h) => h.name === 'Đà Nẵng')).toBe(true);
  });

  it('returns empty when no match', () => {
    expect(filterDestinationCatalog('zzzz')).toEqual([]);
  });
});

describe('findCatalogEntry', () => {
  it('returns exact normalized match', () => {
    expect(findCatalogEntry('da lat')?.name).toBe('Đà Lạt');
    expect(findCatalogEntry('ĐÀ LẠT')?.name).toBe('Đà Lạt');
  });

  it('returns null when not exact', () => {
    expect(findCatalogEntry('da')).toBeNull();
  });
});
