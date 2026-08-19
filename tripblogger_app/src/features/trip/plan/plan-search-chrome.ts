/**
 * Plan search uses the same map chrome as Explore (back + search row).
 * Hide it only while the create-trip overlay is open on Plan.
 */
export function shouldShowMapSearchBar(input: {
  bottomTab: string;
  createOverlayOpen: boolean;
}): boolean {
  if (input.bottomTab === 'plan' && input.createOverlayOpen) return false;
  return true;
}
