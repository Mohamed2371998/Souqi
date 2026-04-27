import { api } from './api.js';

(async function load() {
  const [orders, products] = await Promise.all([api('/orders'), api('/products')]);
  document.getElementById('ordersCount').textContent = orders.length;
  document.getElementById('revenue').textContent = orders.reduce((s, o) => s + Number(o.total_price_sar || 0), 0).toFixed(2);
  document.getElementById('lowStock').innerHTML = products.filter((p) => p.stock_qty <= 10).map((p) => `<p>${p.name_ar} (${p.stock_qty})</p>`).join('') || 'لا يوجد';
})();
