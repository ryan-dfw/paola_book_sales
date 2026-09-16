import { useEffect } from 'react';
import type { BannerKind } from '../types';

/** Reads ?success=true / ?canceled=true off the URL once on load (Stripe Checkout's redirect back), then cleans the URL up. */
export function useReturnBanner(showBanner: (kind: BannerKind, message: string) => void) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
      showBanner('success', "Payment received — thank you! We'll follow up with the details soon.");
    } else if (params.get('canceled') === 'true') {
      showBanner('cancel', 'Checkout canceled — no charge was made.');
    }

    if (params.has('success') || params.has('canceled')) {
      params.delete('success');
      params.delete('canceled');
      params.delete('session_id');
      const clean = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (clean ? `?${clean}` : ''));
    }
  }, [showBanner]);
}
