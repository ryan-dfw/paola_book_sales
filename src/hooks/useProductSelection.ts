import { useState } from 'react';
import type { UiLocale } from '../content/types';

/**
 * The three independent choices a buyer makes: language, book format (only
 * meaningful when the selected language actually has more than one — e.g.
 * English has softcover + hardcover, Spanish is softcover only), and
 * whether they want it signed. App.tsx resolves (lang, format) to an actual
 * Stripe product by matching each active product's lang/format metadata —
 * this hook only tracks the buyer's choices, not which product they map to.
 */
export function useProductSelection() {
  const [lang, setLang] = useState<UiLocale>('en');
  const [format, setFormat] = useState('softcover');
  const [signed, setSigned] = useState(false);

  return { lang, setLang, format, setFormat, signed, setSigned };
}
