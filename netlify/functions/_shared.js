// Shared helpers for the Netlify functions in this folder — NOT itself an
// endpoint (no `exports.handler`, so Netlify won't try to invoke it).
//
// Products (and their prices) live entirely in Stripe now — nothing here
// hardcodes which products exist or what they cost. Each function that
// needs product/pricing data asks Stripe for the current active product
// list and works from that, so adding, removing, renaming, or repricing a
// product in the Dashboard is all it takes to change what the site sells.
//
// Optional metadata on each Stripe Product (Dashboard > Product > Metadata):
//   lang   — "en" | "es" — picks which UI-chrome translation (buttons,
//            labels, the Checkout page's own language) wraps that product.
//   format — e.g. "softcover" | "hardcover" — informational only right now,
//            not required for anything to work.
// A product with neither set still works fine — it just shows up under the
// default (English) chrome with no format tag.

const Stripe = require('stripe');

function stripeClient() {
  return Stripe(process.env.STRIPE_SECRET_KEY);
}

// Flat rate, all editions, US only. Shared by create-checkout-session.js
// (adds it as a real Stripe shipping_options line) and manual-order.js
// (adds it to the quoted total for the Venmo/Zelle path, which has no
// Stripe-side shipping line of its own). Also duplicated client-side as
// SHIPPING_FEE_CENTS in src/constants.ts, used to reflect the fee in the
// on-page price before checkout — keep all three in sync if this changes.
const SHIPPING_FEE_CENTS = 600;

/**
 * All active, sellable products — expanded with their default Price so
 * callers get name/description/image/amount/currency in one round trip.
 * A product without an active default Price with a fixed amount (still
 * being set up in the Dashboard, or a "customer chooses price" Price) is
 * skipped rather than surfaced half-broken to the frontend.
 */
async function listActiveProducts(stripe) {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
    limit: 100,
  });

  return products.data
    .filter((product) => {
      const price = product.default_price;
      return price && typeof price === 'object' && typeof price.unit_amount === 'number' && price.currency;
    })
    .map((product) => {
      const price = product.default_price;
      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        image: product.images?.[0] || null,
        lang: product.metadata?.lang || null,
        format: product.metadata?.format || null,
        // Product > Shipping > Package dimensions in the Dashboard. Only the
        // weight is used (the 3D book's mass); null when not filled in.
        weightOz: product.package_dimensions?.weight || null,
        priceId: price.id,
        amount: price.unit_amount,
        currency: price.currency,
      };
    });
}

module.exports = { stripeClient, listActiveProducts, SHIPPING_FEE_CENTS };
