import { useState } from 'react';
import type { Edition } from '../content/types';

/**
 * The independent choices a buyer makes: edition (one of the three real
 * products — English Hardcover, English Softcover, or Spanish — picked
 * directly via the three-way selector rather than separate language/format
 * toggles), whether they want it signed, and whether they want it shipped
 * (an optional extra — the site is built for in-person pickup at an event,
 * so shipping is opt-in). App.tsx resolves `edition` to an actual Stripe
 * product by matching each product's lang/format metadata — this hook only
 * tracks the buyer's choices, not which product it maps to.
 */
export function useProductSelection() {
  const [edition, setEdition] = useState<Edition>('english');
  const [signed, setSigned] = useState(false);
  const [shipToMe, setShipToMe] = useState(false);

  return { edition, setEdition, signed, setSigned, shipToMe, setShipToMe };
}
