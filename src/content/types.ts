import type { ManualPaymentMethod } from '../types';

export interface ManualMethodLabels {
  venmo: string;
  zelle: string;
}

/** Everything that changes when the customer switches English/Español. */
export interface LocaleContent {
  title: string;
  byline: string;
  blurb: string;
  signedLabel: string;
  buyPrefix: string;
  altToggle: string;
  altToggleClose: string;
  manualIntro: string;
  manualMethodLabels: ManualMethodLabels;
  resultTemplate: (amount: string, method: ManualPaymentMethod, handle: string, code: string) => string;
}
