/** System tags stored on stops but not shown in Plan UI (yet). */
export const PLAN_HIDDEN_STOP_TAGS = new Set(['entry_point']);

export function visibleStopTags(tags: string[]): string[] {
  return tags.filter((tag) => !PLAN_HIDDEN_STOP_TAGS.has(tag));
}
