import { useQuery } from '@tanstack/react-query';

import { compositionsService } from '@/src/services/api/compositions.service';

export function useCompositionsList() {
  return useQuery({
    queryKey: ['compositions', 'list'],
    queryFn: () => compositionsService.list(true),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useCompositionDetail(slug: string | null) {
  return useQuery({
    queryKey: ['compositions', 'detail', slug],
    queryFn: () => compositionsService.getBySlug(String(slug)),
    enabled: Boolean(slug),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
