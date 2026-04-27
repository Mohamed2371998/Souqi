import { api } from './api.js';
import { createTamaraSession } from './tamara.js';
import { createTabbySession } from './tabby.js';

let cartItems = [];
let promoDiscount = 0;

function calcTotals() {
  const subtotalIncl = cartItems.reduce((s, i) => s + Number(i.price_sar) * i.quantity, 0) - promoDiscount;
  const subtotal = subtotalIncl / 1.15;
  const vat = subtotalIncl - subtotal;
  return { subtotal, vat, total: subtotalIncl };
}

async function loadSummary() {
  cartItems = await api('/cart');
  document.getElementById('checkoutItems').innerHTML = cartItems.map((i) => `<div>${i.name_ar} × ${i.quantity}</div>`).join('');
  const { subtotal, vat, total } = calcTotals();
  document.getElementById('checkoutSubtotal').textContent = subtotal.toFixed(2);
  document.getElementById('checkoutVat').textContent = vat.toFixed(2);
  document.getElementById('shipping').textContent = '0.00';
  document.getElementById('checkoutTotal').textContent = total.toFixed(2);
}

async function applyPromo() {
  const code = document.getElementById('promoCode').value.trim();
  const { total } = calcTotals();
  const data = await api('/promo/apply', { method: 'POST', body: JSON.stringify({ code, subtotal: total }) });
  promoDiscount = data.discount;
  await loadSummary();
  alert(`تم تطبيق خصم ${data.discount} ر.س`);
}

document.getElementById('applyPromo').addEventListener('click', () => applyPromo().catch((e) => alert(e.message)));

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payment_method = document.querySelector('input[name="payment"]:checked').value;
  const shipping_address = {
    full_name: full_name.value,
    phone: phone.value,
    city: city.value,
    district: district.value,
    street: street.value,
    postal_code: postal_code.value,
    country: 'SA',
  };

  const order = await api('/orders', { method: 'POST', body: JSON.stringify({ payment_method, shipping_address }) });
  const orderId = order.order_id;

  if (payment_method === 'tamara') return createTamaraSession(orderId);
  if (payment_method === 'tabby') return createTabbySession(orderId);
  if (payment_method === 'cod') {
    await api('/payments/cod', { method: 'POST', body: JSON.stringify({ order_id: orderId }) });
    return location.href = `/pages/order-detail.html?id=${orderId}`;
  }

  const gateway = await api('/payments/initiate', { method: 'POST', body: JSON.stringify({ order_id: orderId, payment_method }) });
  if (gateway.payment_url) location.href = gateway.payment_url;
  else alert(`رمز الدفع: ${gateway.token}`);
});

loadSummary().catch(console.error);
