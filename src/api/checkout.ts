import type { CheckoutRequest, CheckoutResponse } from '../types';

export async function createCheckoutSession(payload: CheckoutRequest): Promise<CheckoutResponse> {
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as CheckoutResponse;

  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Something went wrong starting checkout.');
  }

  return data;
}
