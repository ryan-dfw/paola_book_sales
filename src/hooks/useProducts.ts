import { useEffect, useState } from 'react';
import type { Product } from '../types';
import { getProducts } from '../api/products';

/** Fetches the live product list from Stripe once on mount. Null means "not loaded (yet, or failed)". */
export function useProducts(): Product[] | null {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    getProducts().then((result) => {
      if (!cancelled) setProducts(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return products;
}
