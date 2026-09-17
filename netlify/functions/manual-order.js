// Netlify Function: POST /.netlify/functions/manual-order
//
// For customers who'd rather pay by Venmo or Zelle — neither has a
// processor API a website can hook into, so this isn't a real payment,
// it's just a lookup: it returns the author's handle for the chosen method
// plus a short reference code. No name, email, or address is collected —
// this is built for in-person sales at an event, where the buyer and the
// author are standing next to each other, so asking for personal details
// just to see a Venmo handle would be unnecessary friction (and honestly a
// little alarming). Shipping/fulfillment for remote orders is an
// after-the-event problem, not handled here yet.
//
// TODO before going live for remote sales: email/log this the same way
// stripe-webhook.js does for paid ones, and reintroduce buyer contact
// details at that point — they'll actually be needed once orders ship.

const { stripeClient, listActiveProducts } = require('./_shared');

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

  const { productId, signed: signedRaw, method } = body;
  const signed = Boolean(signedRaw);

  if (!['venmo', 'zelle'].includes(method)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'method must be "venmo" or "zelle".' }),
    };
  }

  const stripe = stripeClient();

  let product;
  try {
    // Stripe stays the source of truth for the amount even on this
    // non-Stripe payment path — we just read it, never charge it.
    const products = await listActiveProducts(stripe);
    product = products.find((p) => p.id === productId);
  } catch (err) {
    console.error('Stripe error listing products for manual order:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  if (!product) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `No active product found for id "${productId}".` }),
    };
  }

  const referenceCode = generateReferenceCode();

  console.log('Manual (Venmo/Zelle) payment instructions issued:', {
    referenceCode,
    method,
    productId: product.id,
    productName: product.name,
    signed,
    amountCents: product.amount,
    currency: product.currency,
    createdAt: new Date().toISOString(),
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      referenceCode,
      amount: product.amount,
      currency: product.currency,
      method,
      handle: PAYMENT_HANDLES[method],
    }),
  };
};
