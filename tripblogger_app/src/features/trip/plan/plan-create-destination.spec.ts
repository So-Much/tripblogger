import { tryCommitDestination, firstCatalogCoords, joinDestinationLabel, wouldExceedLabelMax } from './plan-create-destination';
import type { DestinationChip } from './plan-create-destination';

describe('tryCommitDestination', () => {
  it('creates catalog chip for exact match', () => {
    const r = tryCommitDestination('đà lạt', []);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.chip).toMatchObject({
      kind: 'catalog',
      name: 'Đà Lạt',
      lat: 11.9404,
      lng: 108.4583,
    });
  });

  it('rejects free-text before any catalog chip', () => {
    const r = tryCommitDestination('Biển xanh', []);
    expect(r).toEqual({ ok: false, reason: 'need_catalog' });
  });

  it('allows free-text after a catalog chip', () => {
    const base: DestinationChip[] = [
      { id: '1', kind: 'catalog', name: 'Đà Lạt', lat: 11.9404, lng: 108.4583 },
    ];
    const r = tryCommitDestination('Homestay X', base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.chip).toMatchObject({ kind: 'free', name: 'Homestay X' });
  });

  it('blocks when join would exceed 255', () => {
    const long = 'A'.repeat(250);
    const base: DestinationChip[] = [
      { id: '1', kind: 'catalog', name: long, lat: 1, lng: 2 },
    ];
    const r = tryCommitDestination('Đà Lạt', base);
    expect(r).toEqual({ ok: false, reason: 'label_too_long' });
  });
});

describe('joinDestinationLabel / firstCatalogCoords', () => {
  it('joins with comma-space; coords from first catalog chip', () => {
    const chips: DestinationChip[] = [
      { id: 'a', kind: 'free', name: 'Note' },
      { id: 'b', kind: 'catalog', name: 'Nha Trang', lat: 12.2388, lng: 109.1967 },
      { id: 'c', kind: 'catalog', name: 'Đà Lạt', lat: 11.9404, lng: 108.4583 },
    ];
    expect(joinDestinationLabel(chips)).toBe('Note, Nha Trang, Đà Lạt');
    expect(firstCatalogCoords(chips)).toEqual({ lat: 12.2388, lng: 109.1967 });
  });

  it('returns null coords when no catalog chip', () => {
    expect(firstCatalogCoords([{ id: '1', kind: 'free', name: 'X' }])).toBeNull();
  });
});

describe('wouldExceedLabelMax', () => {
  it('accounts for comma separators', () => {
    const chips: DestinationChip[] = [
      { id: '1', kind: 'catalog', name: 'A'.repeat(252), lat: 1, lng: 2 },
    ];
    expect(wouldExceedLabelMax(chips, 'BB')).toBe(true); // 252 + ', ' + 2 = 256
    expect(wouldExceedLabelMax(chips, 'B')).toBe(false); // 255
  });
});
