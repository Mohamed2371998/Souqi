# Souqi — Saudi Market E-commerce (Full Stack)

منصة تجارة إلكترونية موجهة للسوق السعودي لبيع الإلكترونيات ومنتجات العناية الشخصية، بواجهة عربية RTL ودعم BNPL (تمارا/تابي) والدفع المحلي (مدى/STC Pay/Apple Pay/COD).

## Tech Stack
- **Backend:** Node.js + Express
- **Database:** MySQL 8
- **Frontend:** Vanilla JS + HTML + CSS (RTL)
- **Auth:** JWT
- **Uploads:** Multer
- **Security:** Helmet, CORS, bcrypt(12), express-validator, rate limiters

## Project Structure
- `database/schema.sql`
- `backend/` (API + controllers + routes + middleware)
- `frontend/` (HTML pages + JS + CSS)

## 1) Database setup
```bash
mysql -u root -p < database/schema.sql
```

## 2) Environment setup
```bash
cp .env.example backend/.env
```
Update values in `backend/.env`:
- DB_HOST, DB_USER, DB_PASS, DB_NAME
- JWT_SECRET
- MOYASAR_API_KEY (or HyperPay token)
- TAMARA_API_TOKEN, TAMARA_NOTIFICATION_TOKEN
- TABBY_PUBLIC_KEY, TABBY_SECRET_KEY, TABBY_MERCHANT_CODE
- FRONTEND_URL, PORT

## 3) Backend run
```bash
cd backend
npm install
npm run dev
```
API base: `http://localhost:4000/api`

## 4) Frontend run
Use any static server from `frontend/`, e.g.:
```bash
cd frontend
python3 -m http.server 5500
```
Open `http://localhost:5500/index.html`

## Key API Routes
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Products: `/api/products`
- Cart: `/api/cart`
- Orders: `/api/orders`, `/api/orders/:id/invoice`
- Payments: `/api/payments/initiate`, `/api/payments/tamara/create-session`, `/api/payments/tabby/create-session`, `/api/payments/cod`
- System: `/api/system/download-project` (Download ZIP of project files)

## Sandbox Payment Testing Guide

### Moyasar / Gateway (Mada/Visa/MC/Apple Pay/STC Pay)
1. Set `MOYASAR_API_KEY` in `.env`.
2. Create order from checkout.
3. Call `/api/payments/initiate` with `{ order_id, payment_method }`.
4. Redirect to `payment_url` and complete sandbox payment.
5. Webhook to `/api/payments/callback` updates `orders.payment_status`.

### Tamara (3 installments)
1. Set `TAMARA_API_TOKEN`, `TAMARA_NOTIFICATION_TOKEN`, `TAMARA_SANDBOX=true`.
2. In checkout choose Tamara.
3. Backend calls `/api/payments/tamara/create-session` and returns `checkout_url`.
4. Customer redirects to Tamara; notification endpoint `/api/payments/tamara/notification` updates payment status.
5. Verification header required: `x-notification-token`.

### Tabby (4 installments)
1. Set `TABBY_PUBLIC_KEY`, `TABBY_SECRET_KEY`, `TABBY_MERCHANT_CODE`.
2. In checkout choose Tabby.
3. Backend calls `/api/payments/tabby/create-session` and returns redirect URL.
4. Webhook `/api/payments/tabby/webhook` validates HMAC SHA-256 in `Tabby-Signature`.
5. On `payment.approved` / `payment.closed` order is marked as paid.

### COD
1. Choose "الدفع عند الاستلام".
2. Endpoint `/api/payments/cod` applies `COD_FEE_SAR` (default 15 SAR).

## VAT
- VAT rate default 15% (`VAT_RATE=0.15`)
- Checkout and invoices show:
  - المجموع قبل الضريبة
  - ضريبة القيمة المضافة (15%)
  - الإجمالي
- VAT registration number shown in invoice footer.

## Notes
- UI is Arabic-first with RTL layout (`dir="rtl"`).
- Price formatting helper supports SAR values.
- Admin pages included for dashboard/product/order management.
