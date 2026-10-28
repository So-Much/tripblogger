import type { ClientForm } from './client-form';

export type ClientBehavior = {
  form: ClientForm;
  /** Finger drag on sheets. Pointer and tablet use a fixed panel. */
  dragSheets: boolean;
  /** Swipe a row to reveal delete. Pointer keeps the visible delete control. */
  swipeToDelete: boolean;
  /** Long-press a stop to reorder. Pointer does not use press-and-hold. */
  longPressReorder: boolean;
  /** Nearby list stays beside the map instead of a sheet you have to pull up. */
  persistentExplore: boolean;
  /** Home feed and deals sit side by side. */
  splitHome: boolean;
  /** Width of the map side panel. Zero means a full-width sheet. */
  sidePanelWidth: number;
};

/**
 * Phone: one column, bottom sheets, finger gestures.
 * Tablet: map and list side by side, still touch-sized, no sheet dragging.
 * Desktop: click, visible controls, a wider side panel.
 */
export function resolveClientBehavior(form: ClientForm): ClientBehavior {
  if (form === 'desktop') {
    return {
      form,
      dragSheets: false,
      swipeToDelete: false,
      longPressReorder: false,
      persistentExplore: true,
      splitHome: true,
      sidePanelWidth: 420,
    };
  }
  if (form === 'tablet') {
    return {
      form,
      dragSheets: false,
      swipeToDelete: true,
      longPressReorder: true,
      persistentExplore: true,
      splitHome: true,
      sidePanelWidth: 340,
    };
  }
  return {
    form,
    dragSheets: true,
    swipeToDelete: true,
    longPressReorder: true,
    persistentExplore: false,
    splitHome: false,
    sidePanelWidth: 0,
  };
}
