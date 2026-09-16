import { useCallback, useState } from 'react';
import type { BannerKind, Locale } from '../types';
import { createCheckoutSession } from '../api/checkout';

export function useCheckout(showBanner: (kind: BannerKind, message: string) => void) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const startCheckout = useCallback(
    async (locale: Locale, signed: boolean) => {
      setIsRedirecting(true);

      try {
        const { url } = await createCheckoutSession({ format: locale, signed });
        window.location.href = url as string;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong starting checkout.';
        showBanner(
          'cancel',
          `Couldn't start checkout: ${message}. (Expected during local setup until Stripe keys are configured — see README.)`
        );
        setIsRedirecting(false);
      }
    },
    [showBanner]
  );

  return { startCheckout, isRedirecting };
}
