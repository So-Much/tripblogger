import { apiClient } from '@/src/services/api/client';
import type { CompositionDetail, CompositionListItem } from '@/src/types/composition';

export const compositionsService = {
  async list(active = true): Promise<{ items: CompositionListItem[] }> {
    const res = await apiClient.get<{ items: CompositionListItem[] }>('/compositions', {
      params: { active: active ? 'true' : 'false' },
    });
    return res.data;
  },

  async getBySlug(slug: string): Promise<CompositionDetail> {
    const res = await apiClient.get<CompositionDetail>(`/compositions/${slug}`);
    return res.data;
  },
};
