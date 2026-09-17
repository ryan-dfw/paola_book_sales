import { useState } from 'react';
import type { Edition } from '../content/types';

/**
 * The two independent choices a buyer makes: edition (one of the three real
 * products — English Hardcover, English Softcover, or Spanish — picked
 * directly via the three-way selector rather than separate language/format
 * toggles) and whether they want it signed. App.tsx resolves `edition` to an
 * actual Stripe product by matching each product's lang/format metadata —
 * this hook only tracks the buyer's choice, not which product it maps to.
 */
export function useProductSelection() {
  const [edition, setEdition] = useState<Edition>('english');
  const [signed, setSigned] = useState(false);

  return { edition, setEdition, signed, setSigned };
}
