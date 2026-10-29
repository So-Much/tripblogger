import {
  commitCustomOption,
  matchKnownOption,
  parseCustomOptionDraft,
  resolveTravelModeForDto,
} from './plan-create-option';

const TRAVEL_IDS = ['motorbike', 'car', 'foot', 'bike'] as const;
const TRAVEL_LABELS = {
  motorbike: 'Xe máy',
  car: 'Ô tô',
  foot: 'Đi bộ',
  bike: 'Xe đạp',
} as const;

describe('parseCustomOptionDraft', () => {
  it('trims and rejects empty or comma-only input', () => {
    expect(parseCustomOptionDraft('')).toBeNull();
    expect(parseCustomOptionDraft('   ')).toBeNull();
    expect(parseCustomOptionDraft(',')).toBeNull();
    expect(parseCustomOptionDraft('  ,  ')).toBeNull();
  });

  it('returns trimmed label and strips a trailing submit comma', () => {
    expect(parseCustomOptionDraft('  Grab  ')).toBe('Grab');
    expect(parseCustomOptionDraft('Xe ôm,')).toBe('Xe ôm');
  });
});

describe('matchKnownOption', () => {
  it('matches a known id or accent-insensitive label', () => {
    expect(matchKnownOption('car', TRAVEL_IDS, TRAVEL_LABELS)).toBe('car');
    expect(matchKnownOption('xe may', TRAVEL_IDS, TRAVEL_LABELS)).toBe('motorbike');
    expect(matchKnownOption('Ô TÔ', TRAVEL_IDS, TRAVEL_LABELS)).toBe('car');
  });

  it('returns null when the draft is a true custom value', () => {
    expect(matchKnownOption('Grab', TRAVEL_IDS, TRAVEL_LABELS)).toBeNull();
  });
});

describe('commitCustomOption', () => {
  it('selects the known chip when the typed value matches one', () => {
    expect(commitCustomOption('Ô tô', TRAVEL_IDS, TRAVEL_LABELS)).toEqual({
      kind: 'known',
      id: 'car',
    });
  });

  it('commits a custom label when nothing matches', () => {
    expect(commitCustomOption(' Grab bike ', TRAVEL_IDS, TRAVEL_LABELS)).toEqual({
      kind: 'custom',
      label: 'Grab bike',
    });
  });

  it('rejects empty drafts', () => {
    expect(commitCustomOption('  ', TRAVEL_IDS, TRAVEL_LABELS)).toEqual({ kind: 'empty' });
  });
});

describe('resolveTravelModeForDto', () => {
  it('keeps the last known API mode when a custom label is selected', () => {
    expect(resolveTravelModeForDto('car')).toBe('car');
  });

  it('falls back to motorbike so CreateTripDto always gets a valid enum', () => {
    expect(resolveTravelModeForDto(null)).toBe('motorbike');
  });
});
