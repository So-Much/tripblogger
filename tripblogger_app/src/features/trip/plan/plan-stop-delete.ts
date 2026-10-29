export const PLAN_STOP_ROW_ACTION_SIZE = 44;

export type PlanStopDeleteTarget = {
  stopId: string;
  titleKey: 'planDeleteStop';
  message: string;
};

export function planStopDeleteTarget(stop: {
  id: string;
  name: string;
}): PlanStopDeleteTarget {
  return {
    stopId: stop.id,
    titleKey: 'planDeleteStop',
    message: stop.name,
  };
}

export type PlanStopRowAction = 'delete' | 'settings';

/** Separate trailing hit targets so trash does not share the gear control. */
export function planStopRowActionSlots(opts: {
  showDelete: boolean;
  showSettings: boolean;
}): Array<{ action: PlanStopRowAction; width: number }> {
  const slots: Array<{ action: PlanStopRowAction; width: number }> = [];
  if (opts.showDelete) {
    slots.push({ action: 'delete', width: PLAN_STOP_ROW_ACTION_SIZE });
  }
  if (opts.showSettings) {
    slots.push({ action: 'settings', width: PLAN_STOP_ROW_ACTION_SIZE });
  }
  return slots;
}
