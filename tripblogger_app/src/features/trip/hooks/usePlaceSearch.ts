import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { mapService } from '../services/map.service';
import { useMapStore } from '../store/map.store';
import { useRecentSearchesStore } from '../search/recent-searches.store';
import { mapListRetryDelay, shouldRetryMapListQuery } from './map-query-retry';

/**
 * Search lifecycle: debounce → RQ AbortSignal on query-key change → ignore stale writes
 * if the user cleared/changed the query before the response landed.
 */
export function usePlaceSearch(
  origin?: { lat: number; lng: number } | null,
  bias?: { lat: number; lng: number } | null,
) {
  const query = useMapStore((s) => s.searchQuery);
  const setSearchResults = useMapStore((s) => s.setSearchResults);
  const [debounced, setDebounced] = useState(query);
  const appliedQueryRef = useRef(debounced);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    appliedQueryRef.current = debounced;
  }, [debounced]);

  const searchQuery = useQuery({
    queryKey: [
      'map',
      'search',
      debounced,
      origin?.lat.toFixed(3),
      origin?.lng.toFixed(3),
      bias?.lat.toFixed(3),
      bias?.lng.toFixed(3),
    ],
    enabled: debounced.length >= 2,
    queryFn: ({ signal }) =>
      mapService.search(
        {
          q: debounced,
          lat: origin?.lat,
          lng: origin?.lng,
          biasLat: bias?.lat,
          biasLng: bias?.lng,
          limit: 15,
        },
        signal,
      ),
    // Successful empty lists are not retried — only thrown failures.
    retry: shouldRetryMapListQuery,
    retryDelay: mapListRetryDelay,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (debounced.length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchQuery.isError && !searchQuery.isFetching) {
      // Avoid leaving stale results that look like a successful empty/wrong list.
      setSearchResults([]);
      return;
    }
    if (!searchQuery.data) return;
    // Ignore late responses after the user typed something else / cleared search.
    if (appliedQueryRef.current !== debounced) return;
    if (useMapStore.getState().searchQuery.trim() !== debounced) return;
    setSearchResults(searchQuery.data);
  }, [
    searchQuery.data,
    searchQuery.isError,
    searchQuery.isFetching,
    debounced,
    setSearchResults,
  ]);

  return {
    ...searchQuery,
    debounced,
    showError: searchQuery.isError && !searchQuery.isFetching && debounced.length >= 2,
  };
}

export function useRememberSearch() {
  const add = useRecentSearchesStore((s) => s.add);
  return add;
}
