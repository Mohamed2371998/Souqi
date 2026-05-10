import { API_BASE, api } from './api.js';

(async function load() {
  const id = new URLSearchParams(location.search).get('id');
  const order = await api(`/orders/${id}`);
  document.getElementById('orderDetail').innerHTML = `
    <div class="card">
      <h3>طلب #${order.id}</h3>
      <p>الحالة: ${order.order_status} | الدفع: ${order.payment_status}</p>
      ${order.items.map((i) => `<div>${i.name_ar} × ${i.quantity} = ${(i.quantity * i.unit_price_sar).toFixed(2)} ر.س</div>`).join('')}
      <hr/>
      <p>المجموع قبل الضريبة: ${(order.total_price_sar - order.vat_amount).toFixed(2)} ر.س</p>
      <p>ضريبة القيمة المضافة (15%): ${Number(order.vat_amount).toFixed(2)} ر.س</p>
      <h3>الإجمالي: ${Number(order.total_price_sar).toFixed(2)} ر.س</h3>
      <p>الرقم الضريبي: 300000000000003</p>
      <a class="btn" target="_blank" href="${API_BASE}/orders/${order.id}/invoice">نسخة HTML للفواتير</a>
    </div>
  `;
})();
