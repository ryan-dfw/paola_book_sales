// Netlify Function: POST /.netlify/functions/create-checkout-session
//
// Creates a Stripe-hosted Checkout Session for the selected language
// edition and returns its URL. The frontend redirects the browser there —
// card (and PayPal / Cash App Pay, once enabled) details are entered on
// Stripe's page, never on ours.
//
// No shipping is collected here — this build is for in-person handoff at
// an event; shipping/fulfillment gets built out after that.
//
// Note on extra payment methods: this deliberately does NOT set
// `payment_method_types`. Leaving it unset puts Stripe in "automatic
// payment methods" mode, which shows whatever's turned on in the
// Dashboard (Settings > Payment methods) for this account/currency —
// so enabling PayPal and Cash App Pay there is the entire integration;
// no code change needed here to add them.

const Stripe = require('stripe');
const { resolvePriceId } = require('./_shared');

// Stripe Checkout's own UI (buttons, labels, form chrome) is translated
// automatically based on this. It does NOT translate strings we supply
// ourselves (the custom field label below) — that we localize by hand.
const CHECKOUT_LOCALES = {
  en: 'en',
  es: 'es', // use 'es-419' instead if the audience is specifically Latin America
};

const INSCRIPTION_LABELS = {
  en: 'Name for the inscription (optional)',
  es: 'Nombre para la dedicatoria (opcional)',
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

  let format;
  let signed;
  try {
    ({ format, signed } = JSON.parse(event.body || '{}'));
    signed = Boolean(signed);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const priceId = resolvePriceId(format);
  if (!priceId) {
    const envVar = `STRIPE_PRICE_${String(format).toUpperCase()}`;
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `No price configured for format "${format}". Set ${envVar} in .env.`,
      }),
    };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const siteUrl = process.env.URL || 'http://localhost:8888';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: CHECKOUT_LOCALES[format] || 'auto',
      line_items: [{ price: priceId, quantity: 1 }],
      // Only signed copies ask for a name to inscribe — a real Stripe Checkout
      // field, shown on Stripe's page itself, not on ours. Doesn't affect price.
      ...(signed
        ? {
            custom_fields: [
              {
                key: 'inscription_name',
                label: {
                  type: 'custom',
                  custom: INSCRIPTION_LABELS[format] || INSCRIPTION_LABELS.en,
                },
                type: 'text',
                optional: true,
              },
            ],
          }
        : {}),
      metadata: { format, signed: signed ? 'yes' : 'no' },
      success_url: `${siteUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?canceled=true`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('Stripe error creating checkout session:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
