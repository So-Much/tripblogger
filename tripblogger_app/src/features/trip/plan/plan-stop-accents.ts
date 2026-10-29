import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { TranslationKey } from '@/src/i18n';
import { resolvePlaceCategoryVisual } from '@/src/utils/location-type-display';
import type { PlanTravelMode, StopStatus, TripStopDto } from '../types/plan';
import { deriveStopDisplayStatus } from './plan-stop-status';
import { PLAN_HIDDEN_STOP_TAGS } from './plan-stop-tags';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type PlanStopAccentVariant =
  | 'ribbon-tl'
  | 'ribbon-tr'
  | 'diagonal-tr'
  | 'edge-stripe'
  | 'pill';

export type PlanStopAccent = {
  key: string;
  variant: PlanStopAccentVariant;
  labelKey?: TranslationKey;
  label?: string;
  icon?: MaterialIconName;
  color: string;
  onColor?: string;
};

export type PlanStopAccentLayout = {
  ribbonTl: PlanStopAccent | null;
  ribbonTr: PlanStopAccent | null;
  diagonalTr: PlanStopAccent | null;
  pills: PlanStopAccent[];
  edgeStripe: PlanStopAccent | null;
  /** Stop has a pinned fixed time — card gets highlight styling. */
  fixedTime: boolean;
};

const ON_LIGHT = '#FFFFFF';

export const PLAN_STOP_ACCENT_PALETTE = {
  must: '#DC2626',
  fixedTime: '#7C3AED',
  stay: '#0284C7',
  doing: '#EA580C',
  done: '#16A34A',
  skipped: '#94A3B8',
  danger: '#DC2626',
  warning: '#D97706',
  duration: '#6366F1',
  travel: '#0EA5E9',
  note: '#A855F7',
  tag: '#64748B',
} as const;

const PALETTE = PLAN_STOP_ACCENT_PALETTE;

const STATUS_KEY: Record<Exclude<StopStatus, 'todo'>, TranslationKey> = {
  doing: 'planStatusDoing',
  done: 'planStatusDone',
  skipped: 'planStatusSkipped',
};

const STATUS_ICON: Record<Exclude<StopStatus, 'todo'>, MaterialIconName> = {
  doing: 'timelapse',
  done: 'check-circle-outline',
  skipped: 'skip-next',
};

const STATUS_COLOR: Record<Exclude<StopStatus, 'todo'>, string> = {
  doing: PALETTE.doing,
  done: PALETTE.done,
  skipped: PALETTE.skipped,
};

const TAG_KEY: Record<string, TranslationKey> = {
  accommodation: 'planTagAccommodation',
};

const TAG_ICON: Record<string, MaterialIconName> = {
  accommodation: 'hotel',
};

const TAG_COLOR: Record<string, string> = {
  accommodation: PALETTE.stay,
};

const SYSTEM_TAGS = new Set(['accommodation']);

export const TRAVEL_MODE_KEY: Record<
  PlanTravelMode,
  'planModeMotorbike' | 'planModeCar' | 'planModeFoot' | 'planModeBike'
> = {
  motorbike: 'planModeMotorbike',
  car: 'planModeCar',
  foot: 'planModeFoot',
  bike: 'planModeBike',
};

export const TRAVEL_MODE_ICON: Record<PlanTravelMode, MaterialIconName> = {
  motorbike: 'two-wheeler',
  car: 'directions-car',
  foot: 'directions-walk',
  bike: 'pedal-bike',
};

export const TRAVEL_MODE_COLOR: Record<PlanTravelMode, string> = {
  motorbike: '#F97316',
  car: '#2563EB',
  foot: '#059669',
  bike: '#0891B2',
};

function pill(
  key: string,
  color: string,
  opts: Pick<PlanStopAccent, 'labelKey' | 'label' | 'icon'>,
): PlanStopAccent {
  return { key, variant: 'pill', color, onColor: color, ...opts };
}

/**
 * Accents for a plan stop card.
 * Must → top-right diagonal ribbon (safe zone away from title/actions).
 * Conflicts → pills only (no overlay covering delete).
 * Travel mode → shown on connector, not as card pill.
 */
export function buildPlanStopAccents(stop: TripStopDto): PlanStopAccentLayout {
  const pills: PlanStopAccent[] = [];
  let edgeStripe: PlanStopAccent | null = null;
  let ribbonTl: PlanStopAccent | null = null;
  let ribbonTr: PlanStopAccent | null = null;
  let diagonalTr: PlanStopAccent | null = null;

  const status = deriveStopDisplayStatus(stop);
  const fixedTime = stop.anchorTime != null && stop.anchorTime !== '';

  // Must-go: diagonal from top toward top-right (safe zone).
  if (stop.priority === 'must') {
    diagonalTr = {
      key: 'priority',
      variant: 'diagonal-tr',
      labelKey: 'planPriorityMust',
      icon: 'flag',
      color: PALETTE.must,
      onColor: ON_LIGHT,
    };
  }

  if (status === 'doing') {
    edgeStripe = {
      key: 'stripe-doing',
      variant: 'edge-stripe',
      color: PALETTE.doing,
    };
  } else if (status === 'done') {
    edgeStripe = {
      key: 'stripe-done',
      variant: 'edge-stripe',
      color: PALETTE.done,
    };
  }

  pills.push(
    pill('duration', PALETTE.duration, {
      label: `${stop.durationMinutes}′`,
      icon: 'schedule',
    }),
  );

  if (status !== 'todo') {
    pills.push(
      pill(`status-${status}`, STATUS_COLOR[status], {
        labelKey: STATUS_KEY[status],
        icon: STATUS_ICON[status],
      }),
    );
  }

  if (stop.category) {
    const cat = resolvePlaceCategoryVisual(stop.category);
    if (cat.code !== 'other') {
      pills.push(
        pill('category', cat.color, {
          label: cat.label,
          icon: cat.icon,
        }),
      );
    }
  }

  for (const tag of stop.tags) {
    if (PLAN_HIDDEN_STOP_TAGS.has(tag) || !SYSTEM_TAGS.has(tag)) continue;
    pills.push(
      pill(`tag-${tag}`, TAG_COLOR[tag] ?? PALETTE.tag, {
        labelKey: TAG_KEY[tag],
        icon: TAG_ICON[tag],
      }),
    );
  }

  for (const tag of stop.tags) {
    if (PLAN_HIDDEN_STOP_TAGS.has(tag) || SYSTEM_TAGS.has(tag)) continue;
    const trimmed = tag.trim();
    if (!trimmed) continue;
    pills.push(
      pill(`tag-${tag}`, PALETTE.tag, {
        label: trimmed.length > 14 ? `${trimmed.slice(0, 13)}…` : trimmed,
      }),
    );
  }

  if (stop.note?.trim()) {
    pills.push(
      pill('note', PALETTE.note, {
        labelKey: 'planStopNote',
        icon: 'sticky-note-2',
      }),
    );
  }

  return {
    ribbonTl,
    ribbonTr,
    diagonalTr,
    pills,
    edgeStripe,
    fixedTime,
  };
}
