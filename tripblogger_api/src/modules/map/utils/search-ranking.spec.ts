import {
  normalizeVi,
  trigramSimilarity,
  textMatchScore,
  rankPlaces,
  type RankInput,
} from './search-ranking';

describe('normalizeVi', () => {
  it('folds Vietnamese diacritics and đ', () => {
    expect(normalizeVi('Phở Hà Nội')).toBe('pho ha noi');
    expect(normalizeVi('Đà Nẵng')).toBe('da nang');
  });

  it('lowercases and collapses whitespace', () => {
    expect(normalizeVi('  CAFE   Trung   Nguyên ')).toBe('cafe trung nguyen');
  });

  it('is a no-op-ish for plain ascii', () => {
    expect(normalizeVi('Circle K')).toBe('circle k');
  });
});

describe('trigramSimilarity', () => {
  it('returns 1 for identical normalized strings', () => {
    expect(trigramSimilarity('pho', 'pho')).toBe(1);
  });

  it('scores close typos above unrelated strings', () => {
    const close = trigramSimilarity('starbucks', 'starbuck');
    const far = trigramSimilarity('starbucks', 'pharmacy');
    expect(close).toBeGreaterThan(far);
  });

  it('returns 0 when either side has no trigrams overlap', () => {
    expect(trigramSimilarity('abc', 'xyz')).toBe(0);
  });
});

describe('textMatchScore', () => {
  it('ranks exact >= prefix > contains > typo', () => {
    const exact = textMatchScore('pho', 'Pho');
    const prefix = textMatchScore('pho', 'Phở Bát Đàn', null);
    const contains = textMatchScore('bat', 'Phở Bát Đàn', null);
    const typo = textMatchScore('pho24', 'Phở 2 Bốn', null);
    expect(exact).toBeGreaterThanOrEqual(prefix);
    expect(prefix).toBeGreaterThan(contains);
    expect(contains).toBeGreaterThan(typo);
    expect(typo).toBeGreaterThanOrEqual(0);
  });

  it('matches accent-insensitively across name and address', () => {
    expect(textMatchScore('da nang', 'Chợ Hàn', 'Đà Nẵng')).toBeGreaterThan(0);
  });
});

describe('rankPlaces', () => {
  const base = (over: Partial<RankInput>): RankInput => ({
    id: 'x', name: 'X', address: null, source: 'photon', rating: null, lat: 21, lng: 105, ...over,
  });

  it('puts prefix matches above pure-distance winners', () => {
    const near = base({ id: 'near', name: 'Bún Bò Huế', lat: 21.0001, lng: 105.0001 });
    const pho = base({ id: 'pho', name: 'Phở Thìn', lat: 21.5, lng: 105.5 });
    const ranked = rankPlaces('pho', [near, pho], { lat: 21, lng: 105 });
    expect(ranked[0].id).toBe('pho');
  });

  it('prefers db source and closer bias when text ties', () => {
    const far = base({ id: 'far', name: 'Phở Thìn', source: 'photon', lat: 22, lng: 106 });
    const dbNear = base({ id: 'dbNear', name: 'Phở Thìn', source: 'db', lat: 21.001, lng: 105.001 });
    const ranked = rankPlaces('pho thin', [far, dbNear], { lat: 21, lng: 105 });
    expect(ranked[0].id).toBe('dbNear');
  });

  it('does not mutate the input array', () => {
    const arr = [base({ id: 'a' }), base({ id: 'b' })];
    const copy = [...arr];
    rankPlaces('a', arr, null);
    expect(arr).toEqual(copy);
  });
});
