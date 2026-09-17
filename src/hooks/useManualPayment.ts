import { useCallback, useEffect, useState } from 'react';
import type { ManualOrderResult, ManualPaymentMethod } from '../types';
import { submitManualOrder } from '../api/manualOrder';

/**
 * In-person payment helper: no name/address collection. The buyer and the
 * author are standing next to each other, so this just needs to surface
 * which handle to pay and a short reference code — nothing else.
 * Automatically re-fetches whenever the panel is open and the method,
 * product, or signed-copy choice changes.
 */
export function useManualPayment(productId: string | null, signed: boolean) {
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

    submitManualOrder({ productId, signed, method })
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
  }, [isOpen, productId, signed, method]);

  return { isOpen, toggle, method, setMethod, loading, result, error };
}
