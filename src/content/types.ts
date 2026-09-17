import type { ManualPaymentMethod } from '../types';

/**
 * The site's own UI-chrome language — separate from which Stripe product is
 * selected. It's also the book's display language now (title/byline), since
 * those are site content, not Stripe data (Stripe product names are
 * internal/dev-facing, not meant to be shown to customers verbatim).
 */
export type UiLocale = 'en' | 'es';

/**
 * The one flat three-way choice a buyer makes, standing in for what used to
 * be two separate toggles (language, then conditionally format). There are
 * only three real products today — English Hardcover, English Softcover,
 * and Spanish — so this maps directly onto them instead of onto an
 * independent (lang, format) pair. 'english' means the English softcover
 * edition (the default); Spanish only comes in one format today, so there's
 * no separate "Spanish hardcover" option.
 */
export type Edition = 'hardcover' | 'english' | 'espanol';

export interface ManualMethodLabels {
  venmo: string;
  zelle: string;
}

/** Pure UI/site chrome text — not Stripe data. Blurb, price, and cover image are still read live from the selected Stripe product; title/byline are fixed per language since Stripe product names aren't customer-facing copy. */
export interface LocaleContent {
  title: string;
  byline: string;
  signedLabel: string;
  buyPrefix: string;
  altToggle: string;
  altToggleClose: string;
  manualIntro: string;
  manualMethodLabels: ManualMethodLabels;
  resultTemplate: (amount: string, method: ManualPaymentMethod, handle: string, code: string) => string;
}
