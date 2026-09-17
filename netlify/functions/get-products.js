// Netlify Function: GET /.netlify/functions/get-products
//
// Returns the current, active product list read live from Stripe — name,
// blurb, cover image, and price all come from the Stripe Product/Price
// objects, not duplicated as hardcoded values anywhere in the frontend.
// Add, remove, reprice, or re-describe a product in the Dashboard and this
// endpoint (and everything downstream of it — the product picker, the
// on-page price, the buy button, and the manual Venmo/Zelle instructions)
// picks it up automatically.

const { stripeClient, listActiveProducts } = require('./_shared');

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

  const stripe = stripeClient();

  try {
    const products = await listActiveProducts(stripe);
    return { statusCode: 200, body: JSON.stringify(products) };
  } catch (err) {
    console.error('Stripe error fetching products:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
