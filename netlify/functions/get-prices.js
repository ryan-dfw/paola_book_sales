// Netlify Function: GET /.netlify/functions/get-prices
//
// Returns the current price (in cents) for each language, read live from
// Stripe's Price objects — not duplicated as a hardcoded number anywhere in
// the frontend. Stripe stays the single source of truth: change a price in
// the Dashboard and this endpoint (and everything downstream of it — the
// on-page price, the buy button, and the manual Venmo/Zelle instructions)
// picks it up automatically. Signed copies use the same price as standard.

const Stripe = require('stripe');
const { PRICE_IDS } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
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

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const entries = Object.entries(PRICE_IDS); // [ [lang, priceId], ... ]

  try {
    const results = await Promise.all(
      entries.map(([, priceId]) => (priceId ? stripe.prices.retrieve(priceId) : Promise.resolve(null)))
    );

    const out = {};
    entries.forEach(([lang], i) => {
      const price = results[i];
      out[lang] = price ? { amount: price.unit_amount, currency: price.currency } : null;
    });

    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (err) {
    console.error('Stripe error fetching prices:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
