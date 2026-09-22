import { useCallback, useEffect, useState } from 'react';
import type { ManualOrderResult, ManualPaymentMethod } from '../types';
import { submitManualOrder } from '../api/manualOrder';

/**
 * In-person (or note-based remote) payment helper: still no structured
 * name/address field. Signed and shipping requests both ride along as a
 * note the buyer is asked to leave in the Venmo/Zelle app itself — this
 * hook just needs to surface which handle to pay, the (fee-adjusted) total,
 * and a short reference code. Automatically re-fetches whenever the panel
 * is open and the method, product, signed-copy, or shipping choice changes.
 */
export function useManualPayment(productId: string | null, signed: boolean, ship: boolean) {
  const [isOpen, setIsOpen] = useState(false);
  const [method, setMethod] = useState<ManualPaymentMethod>('venmo');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ManualOrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(() => setIsOpen((open) => !open), []);

  useEffect(() => {
    if (!isOpen || !productId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    submitManualOrder({ productId, signed, ship, method })
      .then((orderResult) => {
        if (!cancelled) setResult(orderResult);
      })
      .catch((err) => {
        if (!cancelled) {
          setResult(null);
          setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, productId, signed, ship, method]);

  return { isOpen, toggle, method, setMethod, loading, result, error };
}
