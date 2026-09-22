# Paola Book Sales

A book-sales website built for a client, with product information and payment handling integrated through Stripe.

The site presents multiple purchase options using product data maintained in Stripe and sends customers through Stripe Checkout to complete payment.

## Implementation

Stripe serves as the source of truth for the site's product catalog. Product titles, descriptions, prices, and purchase options are configured in Stripe rather than duplicated in the codebase.

The sales flow is:

1. Product information and pricing are maintained in Stripe.
2. The site retrieves that data and uses it to construct the available purchase options.
3. The customer selects an option.
4. The customer is sent through Stripe Checkout to complete the transaction.
5. Stripe handles payment collection and processing.

This means changes to product information and pricing can be made through Stripe without modifying or redeploying the site's source code.

## Stack

- TypeScript
- Stripe
- Stripe Checkout
- Netlify

## Project context

This site was built for a real client preparing to sell her book online.

In addition to building the site, I helped set up the Stripe side of the project, including establishing developer access, configuring the products and purchase options, and connecting the client's account for payouts.

The site is deployed through Netlify. The client chose to use the Netlify address rather than a custom domain.

## Design

The site is intentionally small and focused on completing a sale without adding unnecessary steps between the customer and Stripe Checkout.

Product information is managed outside the application so the client does not need changes to the codebase when basic sales information such as pricing or descriptions changes.

## AI assistance

Claude handled the visuals + everything to do with the spinnable book. I'm not a UI / design guy.
