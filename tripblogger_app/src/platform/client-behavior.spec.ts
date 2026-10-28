import { resolveClientBehavior } from './client-behavior';

describe('resolveClientBehavior', () => {
  it('keeps a phone in one column with finger gestures', () => {
    expect(resolveClientBehavior('phone')).toMatchObject({
      dragSheets: true,
      swipeToDelete: true,
      longPressReorder: true,
      persistentExplore: false,
      splitHome: false,
      sidePanelWidth: 0,
    });
  });

  it('puts a tablet beside the map without dragging a sheet', () => {
    expect(resolveClientBehavior('tablet')).toMatchObject({
      dragSheets: false,
      swipeToDelete: true,
      longPressReorder: true,
      persistentExplore: true,
      splitHome: true,
      sidePanelWidth: 340,
    });
  });

  it('uses click and visible controls on a desktop', () => {
    expect(resolveClientBehavior('desktop')).toMatchObject({
      dragSheets: false,
      swipeToDelete: false,
      longPressReorder: false,
      persistentExplore: true,
      splitHome: true,
      sidePanelWidth: 420,
    });
  });
});
