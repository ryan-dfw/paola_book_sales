// Netlify Function: POST /.netlify/functions/stripe-webhook
//
// Stripe calls this after a payment event happens. We verify the signature
// so we know the request really came from Stripe, then react to a
// completed checkout — this is the moment to record the order.
//
// This prototype just logs what it would do. Wire in your real email/order
// system where marked below before going live.

const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const signature = event.headers['stripe-signature'];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    const inscriptionField = session.custom_fields?.find(
      (f) => f.key === 'inscription_name'
    );

    const order = {
      sessionId: session.id,
      email: session.customer_details?.email,
      amountTotal: session.amount_total,
      currency: session.currency,
      format: session.metadata?.format,
      signed: session.metadata?.signed === 'yes',
      inscriptionName: inscriptionField?.text?.value || null,
    };

    console.log('New paid order:', order);

    // TODO before going live: replace this console.log with something real —
    // e.g. email the author (Resend/SendGrid), write to Airtable/a database,
    // or post to Slack. This is the one place order fulfillment starts — and
    // where you'd flag "signed" orders for the author to actually sign.
    //
    // Shipping is intentionally not collected yet (this build is for
    // in-person handoff at an event). Once remote/shipped orders are
    // supported, add `shipping_address_collection` + `shipping_options` back
    // to create-checkout-session.js and read `session.shipping_details` /
    // `session.customer_details.address` here.
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
