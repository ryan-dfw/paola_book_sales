// Netlify Function: POST /.netlify/functions/create-checkout-session
//
// Creates a Stripe-hosted Checkout Session for the selected product and
// returns its URL. The frontend redirects the browser there — card (and
// PayPal / Cash App Pay, once enabled) details are entered on Stripe's
// page, never on ours.
//
// This build is primarily for in-person handoff at an event, so shipping
// stays opt-in: the buyer checks a box on our page for +$6 and we turn on
// Stripe's own address collection for that one session; otherwise no
// address is asked for at all, same as before.
//
// Note on extra payment methods: this deliberately does NOT set
// `payment_method_types`. Leaving it unset puts Stripe in "automatic
// payment methods" mode, which shows whatever's turned on in the
// Dashboard (Settings > Payment methods) for this account/currency —
// so enabling PayPal and Cash App Pay there is the entire integration;
// no code change needed here to add them.

const { stripeClient, listActiveProducts, SHIPPING_FEE_CENTS } = require('./_shared');

// Stripe Checkout's own UI (buttons, labels, form chrome) is translated
// automatically based on this. It does NOT translate strings we supply
// ourselves (the custom field label below) — that we localize by hand,
// keyed off the product's own `lang` metadata.
const CHECKOUT_LOCALES = {
  en: 'en',
  es: 'es', // use 'es-419' instead if the audience is specifically Latin America
};

const INSCRIPTION_LABELS = {
  en: 'Name for the inscription (optional)',
  es: 'Nombre para la dedicatoria (opcional)',
};

// SHIPPING_FEE_CENTS now lives in _shared.js (manual-order.js needs it too).
// Country restriction is specific to Stripe's own address collection, so it
// stays here.
const SHIPPING_ALLOWED_COUNTRIES = ['US'];

// Same localization caveat as INSCRIPTION_LABELS above — Stripe Checkout's
// own chrome is auto-translated by `locale`, but a shipping rate's display
// name is our own string and isn't.
const SHIPPING_RATE_LABELS = {
  en: 'Shipping (USPS Media Mail)',
  es: 'Envío (USPS Media Mail)',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'STRIPE_SECRET_KEY is not set. Copy .env.example to .env and fill it in.',
      }),
    };
  }

  let productId;
  let signed;
  let ship;
  try {
    ({ productId, signed, ship } = JSON.parse(event.body || '{}'));
    signed = Boolean(signed);
    ship = Boolean(ship);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const stripe = stripeClient();

  // Re-look-up the product server-side rather than trusting anything but
  // its id from the client — this also confirms it's still active and has
  // a real price, so a stale/removed product can't be checked out against.
  let product;
  try {
    const products = await listActiveProducts(stripe);
    product = products.find((p) => p.id === productId);
  } catch (err) {
    console.error('Stripe error listing products for checkout:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  if (!product) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `No active product found for id "${productId}".` }),
    };
  }

  const siteUrl = process.env.URL || 'http://localhost:8888';
  const locale = CHECKOUT_LOCALES[product.lang] || 'auto';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale,
      line_items: [{ price: product.priceId, quantity: 1 }],
      // Only signed copies ask for a name to inscribe — a real Stripe Checkout
      // field, shown on Stripe's page itself, not on ours. Doesn't affect price.
      ...(signed
        ? {
            custom_fields: [
              {
                key: 'inscription_name',
                label: {
                  type: 'custom',
                  custom: INSCRIPTION_LABELS[product.lang] || INSCRIPTION_LABELS.en,
                },
                type: 'text',
                optional: true,
              },
            ],
          }
        : {}),
      // Only when the buyer checks "ship it to me" do we ask Stripe to
      // collect an address at all — otherwise Checkout stays exactly like
      // the in-person-pickup flow it always was, no address field shown.
      ...(ship
        ? {
            shipping_address_collection: { allowed_countries: SHIPPING_ALLOWED_COUNTRIES },
            shipping_options: [
              {
                shipping_rate_data: {
                  type: 'fixed_amount',
                  fixed_amount: { amount: SHIPPING_FEE_CENTS, currency: 'usd' },
                  display_name: SHIPPING_RATE_LABELS[product.lang] || SHIPPING_RATE_LABELS.en,
                },
              },
            ],
          }
        : {}),
      metadata: { productId: product.id, signed: signed ? 'yes' : 'no', ship: ship ? 'yes' : 'no' },
      success_url: `${siteUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?canceled=true`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('Stripe error creating checkout session:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
