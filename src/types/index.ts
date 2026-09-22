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
  /** Stripe's package weight (ounces), if set on the product — used by the 3D book's physics. */
  weightOz: number | null;
  amount: number; // integer cents
  currency: string;
}

export interface ManualOrderPayload {
  productId: string;
  signed: boolean;
  /** Buyer wants it shipped — adds the flat fee to the quoted amount. See ManualOrderResult's doc comment for what this doesn't do. */
  ship: boolean;
  method: ManualPaymentMethod;
}

/** What /api/manual-order returns on success. `amount` already includes the shipping fee when `ship` was requested — still no structured name/email/address field, though; that's only ever conveyed via a note the buyer leaves in the Venmo/Zelle app. */
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
  /** Buyer opted to have it shipped (+ flat fee) instead of picking it up at the event. */
  ship: boolean;
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
