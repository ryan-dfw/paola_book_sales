// Flat rate, all editions, US only. Keep this in sync with
// SHIPPING_FEE_CENTS in netlify/functions/create-checkout-session.js — that
// server-side constant is the one Stripe actually charges against; this
// copy exists only so the on-page price can reflect the fee before the
// buyer ever reaches Checkout.
export const SHIPPING_FEE_CENTS = 600;
