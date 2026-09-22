import type { LocaleContent } from './types';

export const es: LocaleContent = {
  title: 'El Narcisista Amor de Mi Vida',
  byline: 'por Paola Roman',
  signedLabel: 'Firmar mi copia',
  shipLabel: '$6 de envío (en EE. UU. continental)',
  shippingNote: 'incluye $6 de envío',
  buyPrefix: 'Pagar',
  altToggle: '¿Prefieres Venmo o Zelle?',
  altToggleClose: 'No, gracias',
  manualIntro: '¿Prefieres pagar con Venmo o Zelle? Elige uno:',
  manualMethodLabels: { venmo: 'Venmo', zelle: 'Zelle' },
  resultTemplate: (amount, method, handle, code) =>
    `Envía ${amount} por ${method === 'venmo' ? 'Venmo' : 'Zelle'} a ${handle} — menciona el código ${code} para identificarlo fácilmente.`,
};
