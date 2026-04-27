import { api } from './api.js';

(async function load() {
  const orders = await api('/orders');
  const map = {
    pending: 'قيد الانتظار', processing: 'قيد المعالجة', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي',
  };
  document.getElementById('ordersList').innerHTML = orders.map((o) => `<article class="card">
    <h4>طلب #${o.id}</h4>
    <p>الإجمالي: ${o.total_price_sar} ر.س</p>
    <span class="status">${map[o.order_status] || o.order_status}</span>
    <a class="btn" href="/pages/order-detail.html?id=${o.id}">عرض</a>
  </article>`).join('');
})();
