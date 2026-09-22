import type { LocaleContent } from './types';

export const en: LocaleContent = {
  title: 'The Narcissist Love of My Life',
  byline: 'by Paola Roman',
  signedLabel: 'Sign my copy',
  shipLabel: '$6 shipping (in the continental US)',
  shippingNote: 'includes $6 shipping',
  buyPrefix: 'Checkout',
  altToggle: 'Prefer Venmo or Zelle?',
  altToggleClose: 'Never mind',
  manualIntro: 'Paying with Venmo or Zelle? Choose one:',
  manualMethodLabels: { venmo: 'Venmo', zelle: 'Zelle' },
  resultTemplate: (amount, method, handle, code, signed, ship) => {
    const methodName = method === 'venmo' ? 'Venmo' : 'Zelle';
    let message = `Send ${amount} via ${methodName} to ${handle} — mention the code ${code} so I know which one to send you.`;
    if (signed) message += ' Leave a note asking to have it signed.';
    if (ship) message += "\nSince you'd like it shipped, leave a note with your mailing address.";
    return message;
  },
};
