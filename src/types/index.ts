// Model layer: the shapes shared across the app. Nothing in here touches the
// DOM or makes a network call — that's what src/api and src/hooks are for.

export type Locale = 'en' | 'es';
export type ManualPaymentMethod = 'venmo' | 'zelle';
export type BannerKind = 'success' | 'cancel';

/** A single Stripe price, as returned by /api/get-prices. One per language — signed no longer changes the price. */
export interface PriceEntry {
  amount: number; // integer cents
  currency: string;
}

export type PricesResponse = Record<Locale, PriceEntry | null>;

export interface ManualOrderPayload {
  format: Locale;
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
  format: Locale;
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
