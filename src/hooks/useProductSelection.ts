import { useState } from 'react';
import type { Locale } from '../types';

/**
 * Language and "signed copy" are deliberately independent bits of state with
 * separate setters, so switching English/Español never resets the signed-copy
 * choice.
 */
export function useProductSelection(initialLocale: Locale = 'en') {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [signed, setSigned] = useState(false);

  return { locale, setLocale, signed, setSigned };
}
