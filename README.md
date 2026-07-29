# Souqi Modern Marketplace

A redesigned Arabic RTL marketplace inspired by the information hierarchy of major regional marketplaces, with an original visual identity.

## Included
- 30 seeded products across electronics, computers, beauty, home and fashion.
- Product images loaded from the DummyJSON product CDN, with a local fallback.
- Search, categories, sorting, wishlist, product quick view, cart and checkout.
- Payment-method UI for mada, Visa, Apple Pay, STC Pay, Tabby, Tamara and cash on delivery.
- Node.js API with `mock` mode enabled by default.
- Server-side adapters for Tabby and Tamara checkout session creation.
- MySQL-ready schema for products, orders, order items and payment events.

## Run
```bash
node server.js
```
Open `http://localhost:8080`.

## Payment modes
`PAYMENTS_MODE=mock` lets the complete checkout flow work safely without charging money. To use live payment providers, complete merchant onboarding, add the provider credentials to environment variables, use HTTPS, configure callback/webhook URLs, and change `PAYMENTS_MODE=live`. Secret keys must stay on the server.

### Cards, mada, Apple Pay and STC Pay
The UI and API contract are included. The recommended production path is Moyasar Form with a publishable frontend key and server-side payment verification using the secret key. Apple Pay additionally requires merchant/domain configuration.

### Tabby and Tamara
The server includes checkout-session adapters. Production activation still requires provider approval, credentials, verified callback/webhook URLs, correct order/customer payloads and end-to-end sandbox testing.

## Important
The local payment badges are presentation assets for this portfolio build. After merchant onboarding, replace them with the current official asset kit/widgets supplied by each provider.

## Deployment

The project is ready for Vercel:

1. Push this folder to `Mohamed2371998/Souqi` on the `main` branch.
2. Import that GitHub repository into Vercel.
3. Keep `PAYMENTS_MODE=mock` for the public portfolio demo.
4. Set `PUBLIC_BASE_URL` to the final production domain after the first deployment.
5. Real payment processing additionally requires approved merchant credentials and the environment variables listed in `.env.example`.

Vercel serves the static storefront from `public/` and routes `/api/*` to `api/index.js`.
