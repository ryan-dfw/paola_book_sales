import { useCallback, useState } from 'react';
import type { BannerKind, BannerState } from '../types';

/** The one sticky banner at the top of the page — shared by checkout errors and the return-from-Stripe messages. */
export function useBanner() {
  const [banner, setBanner] = useState<BannerState | null>(null);

  const showBanner = useCallback((kind: BannerKind, message: string) => {
    setBanner({ kind, message });
  }, []);

  return { banner, showBanner };
}
