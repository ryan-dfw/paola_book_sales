// Model layer: the shapes shared across the app. Nothing in here touches the
// DOM or makes a network call — that's what src/api and src/hooks are for.

export type ManualPaymentMethod = 'venmo' | 'zelle';
export type BannerKind = 'success' | 'cancel';

/**
 * A sellable book product, read live from Stripe (Product + its default
 * Price). Name, blurb, cover image, and amount are Stripe data — nothing
 * here is hardcoded per-product on the frontend or in the functions.
 *
 * `lang`/`format` come from optional Stripe Product metadata (set in the
 * Dashboard: metadata.lang = "en"/"es", metadata.format = "softcover"/
 * "hardcover", etc.) — either can be null if a product isn't tagged.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  image: string | null;
  lang: string | null;
  format: string | null;
  amount: number; // integer cents
  currency: string;
}

export interface ManualOrderPayload {
  productId: string;
  signed: boolean;
  method: ManualPaymentMethod;
}

/** What /api/manual-order returns on success. No name/email/address — this is an in-person handoff, not a shipped order. */
export interface ManualOrderResult {
  referenceCode: string;
  amount: number;
  currency: string;
  method: ManualPaymentMethod;
  handle: string;
}

export interface CheckoutRequest {
  productId: string;
  signed: boolean;
}

/** What /api/create-checkout-session returns. */
export interface CheckoutResponse {
  url?: string;
  error?: string;
}

export interface BannerState {
  kind: BannerKind;
  message: string;
}
