import type { LocaleContent } from './types';

export const es: LocaleContent = {
  title: 'El Narcisista Amor de Mi Vida',
  byline: 'por Paola Roman',
  blurb:
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum ' +
    'dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non ' +
    'proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  signedLabel: 'Firmar mi copia',
  buyPrefix: 'Comprar el libro',
  altToggle: '¿Prefieres Venmo o Zelle?',
  altToggleClose: 'No, gracias',
  manualIntro: '¿Prefieres pagar con Venmo o Zelle? Elige uno:',
  manualMethodLabels: { venmo: 'Venmo', zelle: 'Zelle' },
  resultTemplate: (amount, method, handle, code) =>
    `Envía ${amount} por ${method === 'venmo' ? 'Venmo' : 'Zelle'} a ${handle} — menciona el código ${code} para identificarlo fácilmente.`,
};
