import { shouldShowMapSearchBar } from './plan-search-chrome';

describe('shouldShowMapSearchBar', () => {
  it('shows search on Explore even if Plan create overlay is still mounted', () => {
    expect(
      shouldShowMapSearchBar({ bottomTab: 'explore', createOverlayOpen: true }),
    ).toBe(true);
  });

  it('shows search on Plan when a trip is in view (no create overlay)', () => {
    expect(
      shouldShowMapSearchBar({ bottomTab: 'plan', createOverlayOpen: false }),
    ).toBe(true);
  });

  it('hides search on Plan while the create-trip overlay is open', () => {
    expect(
      shouldShowMapSearchBar({ bottomTab: 'plan', createOverlayOpen: true }),
    ).toBe(false);
  });
});
