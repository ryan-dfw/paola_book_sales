import type { PricesResponse } from '../types';

/** Stripe stays the single source of truth for amounts — nothing here duplicates a price. */
export async function getPrices(): Promise<PricesResponse | null> {
  try {
    const res = await fetch('/api/get-prices');
    if (!res.ok) throw new Error('Failed to load prices');
    return (await res.json()) as PricesResponse;
  } catch (err) {
    console.error(err);
    return null;
  }
}
