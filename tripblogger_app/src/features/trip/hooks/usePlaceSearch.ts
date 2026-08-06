import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { mapService } from '../services/map.service';
import { useMapStore } from '../store/map.store';
import { useRecentSearchesStore } from '../search/recent-searches.store';

export function usePlaceSearch(lat?: number, lng?: number) {
  const query = useMapStore((s) => s.searchQuery);
  const setSearchResults = useMapStore((s) => s.setSearchResults);
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ['map', 'search', debounced, lat?.toFixed(3), lng?.toFixed(3)],
    enabled: debounced.length >= 2,
    queryFn: () => mapService.search({ q: debounced, lat, lng, limit: 15 }),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (searchQuery.data) setSearchResults(searchQuery.data);
    if (debounced.length < 2) setSearchResults([]);
  }, [searchQuery.data, debounced, setSearchResults]);

  return { ...searchQuery, debounced };
}

export function useRememberSearch() {
  const add = useRecentSearchesStore((s) => s.add);
  return add;
}
