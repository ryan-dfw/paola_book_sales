import type { ManualPaymentMethod } from '../types';

/**
 * The site's own UI-chrome language — separate from which Stripe product is
 * selected. It's also the book's display language now (title/byline), since
 * those are site content, not Stripe data (Stripe product names are
 * internal/dev-facing, not meant to be shown to customers verbatim).
 */
export type UiLocale = 'en' | 'es';

export interface ManualMethodLabels {
  venmo: string;
  zelle: string;
}

/** Labels for the book formats a language can come in. Only 'softcover' and 'hardcover' exist today (English has both, Spanish only softcover), keyed to match each product's Stripe metadata.format value. */
export interface FormatLabels {
  softcover: string;
  hardcover: string;
}

/** Pure UI/site chrome text — not Stripe data. Blurb, price, and cover image are still read live from the selected Stripe product; title/byline are fixed per language since Stripe product names aren't customer-facing copy. */
export interface LocaleContent {
  title: string;
  byline: string;
  formatLabels: FormatLabels;
  signedLabel: string;
  buyPrefix: string;
  altToggle: string;
  altToggleClose: string;
  manualIntro: string;
  manualMethodLabels: ManualMethodLabels;
  resultTemplate: (amount: string, method: ManualPaymentMethod, handle: string, code: string) => string;
}
