import { useEffect, useState } from 'react';
import type { PricesResponse } from '../types';
import { getPrices } from '../api/prices';

/** Fetches live prices once on mount. Null means "not loaded (yet, or failed)". */
export function usePrices(): PricesResponse | null {
  const [prices, setPrices] = useState<PricesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    getPrices().then((result) => {
      if (!cancelled) setPrices(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return prices;
}
