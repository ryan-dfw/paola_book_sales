// Shared helpers for the Netlify functions in this folder — NOT itself an
// endpoint (no `exports.handler`, so Netlify won't try to invoke it).
//
// This is the one place that knows which Stripe Price ID corresponds to a
// given language. There's one price per language (signed no longer costs
// extra), so every function that needs pricing logic requires this instead
// of redefining its own copy — a single source of truth to keep in sync
// with Stripe.

const PRICE_IDS = {
  en: process.env.STRIPE_PRICE_EN,
  es: process.env.STRIPE_PRICE_ES,
};

function resolvePriceId(format) {
  return PRICE_IDS[format] || null;
}

module.exports = { PRICE_IDS, resolvePriceId };
