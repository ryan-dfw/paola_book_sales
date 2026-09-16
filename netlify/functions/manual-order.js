// Netlify Function: POST /.netlify/functions/manual-order
//
// For customers who'd rather pay by Venmo or Zelle — neither has a
// processor API a website can hook into, so this isn't a real payment,
// it's just a lookup: it returns the author's handle for the chosen method
// plus a short reference code. No name, email, or address is collected —
// this is built for in-person sales at an event, where the buyer and the
// author are standing next to each other, so asking for personal details
// just to see a Venmo handle would be unnecessary friction (and honestly a
// little alarming). Shipping/fulfillment for remote orders is a
// after-the-event problem, not handled here yet.
//
// TODO before going live for remote sales: email/log this the same way
// stripe-webhook.js does for paid ones, and reintroduce buyer contact
// details at that point — they'll actually be needed once orders ship.

const Stripe = require('stripe');
const { resolvePriceId } = require('./_shared');

// Placeholder handles — replace with the author's real Venmo/Zelle details
// before this goes live. Configurable via env so they're not baked into code.
const PAYMENT_HANDLES = {
  venmo: process.env.VENMO_HANDLE || '@replace-with-real-venmo-handle',
  zelle: process.env.ZELLE_CONTACT || 'replace-with-real-zelle-email-or-phone',
};

function generateReferenceCode() {
  // Avoids visually ambiguous characters (0/O, 1/I) since the customer has
  // to retype this into a Venmo/Zelle note by hand.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BOOK-';
  for (let i = 0; i < 4; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { format, signed: signedRaw, method } = body;
  const signed = Boolean(signedRaw);

  if (!['venmo', 'zelle'].includes(method)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'method must be "venmo" or "zelle".' }),
    };
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

  let price;
  try {
    // Stripe stays the source of truth for the amount even on this
    // non-Stripe payment path — we just read it, never charge it.
    price = await stripe.prices.retrieve(priceId);
  } catch (err) {
    console.error('Stripe error retrieving price for manual order:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  // Retrieve() can succeed while still handing back something unusable here
  // (a "customer chooses price" Price has no unit_amount, a redacted/partial
  // object could be missing currency, etc.). Catch that here with a clear
  // message rather than letting an empty/undefined currency slip through to
  // the browser, where it fails silently as a confusing Intl error.
  if (typeof price.unit_amount !== 'number' || !price.currency) {
    console.error('Stripe price is missing unit_amount/currency for manual order:', price.id);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `Price "${priceId}" doesn\u2019t have a fixed amount/currency set in Stripe.`,
      }),
    };
  }

  const referenceCode = generateReferenceCode();

  console.log('Manual (Venmo/Zelle) payment instructions issued:', {
    referenceCode,
    method,
    format,
    signed,
    amountCents: price.unit_amount,
    currency: price.currency,
    createdAt: new Date().toISOString(),
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      referenceCode,
      amount: price.unit_amount,
      currency: price.currency,
      method,
      handle: PAYMENT_HANDLES[method],
    }),
  };
};
