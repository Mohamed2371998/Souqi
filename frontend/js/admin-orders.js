import { api } from './api.js';

const statuses = ['pending','processing','shipped','delivered','cancelled'];

(async function load() {
  const orders = await api('/orders');
  document.getElementById('adminOrdersList').innerHTML = orders.map((o) => `<div class="card">
    <h4>طلب #${o.id} - ${o.total_price_sar} ر.س</h4>
    <select data-id="${o.id}" class="statusSelect">${statuses.map((s)=>`<option value="${s}" ${s===o.order_status?'selected':''}>${s}</option>`).join('')}</select>
  </div>`).join('');

  document.querySelectorAll('.statusSelect').forEach((s) => s.onchange = async () => {
    await api(`/orders/${s.dataset.id}/status`, { method:'PUT', body: JSON.stringify({ order_status: s.value }) });
    alert('تم التحديث');
  });
})();
