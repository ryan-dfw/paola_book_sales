import type { Product } from '../types';

/** Stripe stays the single source of truth for every product — name, blurb, price, and cover image all come from here, nothing is duplicated in the frontend. */
export async function getProducts(): Promise<Product[] | null> {
  try {
    const res = await fetch('/api/get-products');
    if (!res.ok) throw new Error('Failed to load products');
    return (await res.json()) as Product[];
  } catch (err) {
    console.error(err);
    return null;
  }
}
