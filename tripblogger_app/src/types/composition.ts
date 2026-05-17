export type CompositionTriggerCondition =
  | 'phone_steady'
  | 'level_horizon'
  | 'face_in_intersection'
  | 'manual';

export type CompositionListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
};

export type CompositionGuide = {
  stepOrder: number;
  instruction: string;
  triggerCondition: CompositionTriggerCondition;
};

export type CompositionOverlay = {
  aspectRatio: string;
  svgPath: string;
};

export type CompositionDetail = CompositionListItem & {
  guides: CompositionGuide[];
  overlays: CompositionOverlay[];
};
