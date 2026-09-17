import type { LocaleContent } from './types';

export const es: LocaleContent = {
  title: 'El Narcisista Amor de Mi Vida',
  byline: 'por Paola Roman',
  formatLabels: { softcover: 'Tapa blanda', hardcover: 'Tapa dura' },
  signedLabel: 'Firmar mi copia',
  buyPrefix: 'Pagar',
  altToggle: '¿Prefieres Venmo o Zelle?',
  altToggleClose: 'No, gracias',
  manualIntro: '¿Prefieres pagar con Venmo o Zelle? Elige uno:',
  manualMethodLabels: { venmo: 'Venmo', zelle: 'Zelle' },
  resultTemplate: (amount, method, handle, code) =>
    `Envía ${amount} por ${method === 'venmo' ? 'Venmo' : 'Zelle'} a ${handle} — menciona el código ${code} para identificarlo fácilmente.`,
};
