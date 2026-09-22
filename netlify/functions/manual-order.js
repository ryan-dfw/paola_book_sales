// Netlify Function: POST /.netlify/functions/manual-order
//
// For customers who'd rather pay by Venmo or Zelle — neither has a
// processor API a website can hook into, so this isn't a real payment,
// it's just a lookup: it returns the author's handle for the chosen method,
// a short reference code, and the total to send (bumped by the flat
// shipping fee when the buyer wants it shipped). No name, email, or
// address is collected through a form — this path still has no structured
// field for any of that. Instead, when "signed" or "ship" is checked, the
// quoted instructions (see src/content/en.ts / es.ts's resultTemplate) ask
// the buyer to leave a note in the Venmo/Zelle app itself — the author has
// to actually go read that note in the payment app to get the inscription
// name or shipping address; nothing here captures or surfaces it.
//
// TODO before going live for remote (shipped) sales: email/log this the
// same way stripe-webhook.js does for paid ones, so a "ship" order doesn't
// get missed. Consider adding a real address field at that point too,
// rather than relying on the buyer to remember to leave a note.

const { stripeClient, listActiveProducts, SHIPPING_FEE_CENTS } = require('./_shared');

// Real handles, shown to customers verbatim — set via env (see .env /
// Netlify site settings) rather than hardcoded here.
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

  const { productId, signed: signedRaw, ship: shipRaw, method } = body;
  const signed = Boolean(signedRaw);
  const ship = Boolean(shipRaw);

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
  // Same flat fee Stripe Checkout adds for "ship it to me" — see
  // SHIPPING_FEE_CENTS's own comment in _shared.js. There's no Stripe
  // shipping line on this path (it's not a Stripe payment at all), so we
  // just add it to the quoted total ourselves.
  const amount = product.amount + (ship ? SHIPPING_FEE_CENTS : 0);

  console.log('Manual (Venmo/Zelle) payment instructions issued:', {
    referenceCode,
    method,
    productId: product.id,
    productName: product.name,
    signed,
    ship,
    amountCents: amount,
    currency: product.currency,
    createdAt: new Date().toISOString(),
    // Reminder for whoever reads this log: "signed"/"ship" here just mean
    // the buyer was *told* to leave a note about it in the Venmo/Zelle app.
    // Nothing here confirms they actually did, or captures what it said.
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      referenceCode,
      amount,
      currency: product.currency,
      method,
      handle: PAYMENT_HANDLES[method],
    }),
  };
};
