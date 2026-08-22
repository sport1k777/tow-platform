import { useEffect, useState } from 'react';

import type { GeoPlace } from '@/api/geo';
import { copy } from '@/copy/uk';
import { userFacingError } from '@/ui';

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export function useAddressAutocomplete({
  query,
  selectedLabel,
  enabled,
  search,
}: {
  query: string;
  selectedLabel?: string;
  enabled: boolean;
  search: (query: string) => Promise<{ items: GeoPlace[] }>;
}) {
  const trimmed = query.trim();
  const skip =
    !enabled ||
    trimmed.length < MIN_QUERY_LENGTH ||
    (selectedLabel != null && trimmed === selectedLabel.trim());

  const [fetched, setFetched] = useState<{
    query: string;
    items: GeoPlace[];
    error: string | null;
  } | null>(null);
  const [inFlight, setInFlight] = useState(false);

  useEffect(() => {
    if (skip) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setInFlight(true);
      void search(trimmed)
        .then((response) => {
          if (cancelled) {
            return;
          }
          setFetched({ query: trimmed, items: response.items, error: null });
        })
        .catch((caught) => {
          if (cancelled) {
            return;
          }
          setFetched({
            query: trimmed,
            items: [],
            error: userFacingError(caught) || copy.mapSearchFailed,
          });
        })
        .finally(() => {
          if (!cancelled) {
            setInFlight(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, skip, trimmed]);

  const matched = !skip && fetched?.query === trimmed;
  return {
    items: skip ? [] : (fetched?.items ?? []),
    searching: !skip && (!matched || inFlight),
    error: matched ? fetched.error : null,
    empty: Boolean(matched && !inFlight && !fetched.error && fetched.items.length === 0),
  };
}
