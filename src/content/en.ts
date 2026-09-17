import type { LocaleContent } from './types';

export const en: LocaleContent = {
  title: 'The Narcissist Love of My Life',
  byline: 'by Paola Roman',
  signedLabel: 'Sign my copy',
  buyPrefix: 'Checkout',
  altToggle: 'Prefer Venmo or Zelle?',
  altToggleClose: 'Never mind',
  manualIntro: 'Paying with Venmo or Zelle? Choose one:',
  manualMethodLabels: { venmo: 'Venmo', zelle: 'Zelle' },
  resultTemplate: (amount, method, handle, code) =>
    `Send ${amount} via ${method === 'venmo' ? 'Venmo' : 'Zelle'} to ${handle} — mention the code ${code} so it's easy to find.`,
};
