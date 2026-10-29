import {
  PLAN_STOP_ROW_ACTION_SIZE,
  planStopDeleteTarget,
  planStopRowActionSlots,
} from './plan-stop-delete';

describe('planStopDeleteTarget', () => {
  it('targets the stop id and uses the stop name as confirm copy', () => {
    expect(planStopDeleteTarget({ id: 'stop-42', name: 'Cho Dam' })).toEqual({
      stopId: 'stop-42',
      titleKey: 'planDeleteStop',
      message: 'Cho Dam',
    });
  });
});

describe('planStopRowActionSlots', () => {
  it('keeps delete and settings as separate 44px targets', () => {
    expect(
      planStopRowActionSlots({ showDelete: true, showSettings: true }),
    ).toEqual([
      { action: 'delete', width: PLAN_STOP_ROW_ACTION_SIZE },
      { action: 'settings', width: PLAN_STOP_ROW_ACTION_SIZE },
    ]);
    expect(PLAN_STOP_ROW_ACTION_SIZE).toBe(44);
  });

  it('omits delete when the row is not deletable', () => {
    expect(planStopRowActionSlots({ showDelete: false, showSettings: true })).toEqual([
      { action: 'settings', width: PLAN_STOP_ROW_ACTION_SIZE },
    ]);
  });
});
