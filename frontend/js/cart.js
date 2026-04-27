import { api } from './api.js';

function totals(items) {
  const total = items.reduce((s, i) => s + Number(i.price_sar) * i.quantity, 0);
  const subtotal = total / 1.15;
  const vat = total - subtotal;
  return { subtotal, vat, total };
}

async function loadCart() {
  const items = await api('/cart');
  const wrap = document.getElementById('cartItems');
  wrap.innerHTML = items.map((i) => `<div class="card"><h4>${i.name_ar}</h4><p>${i.quantity} × ${i.price_sar} ر.س</p>
    <button data-id="${i.id}" class="dec">-</button><button data-id="${i.id}" class="inc">+</button><button data-id="${i.id}" class="del">حذف</button></div>`).join('');
  const t = totals(items);
  document.getElementById('subtotal').textContent = t.subtotal.toFixed(2);
  document.getElementById('vat').textContent = t.vat.toFixed(2);
  document.getElementById('total').textContent = t.total.toFixed(2);

  document.querySelectorAll('.del').forEach((b) => b.onclick = async () => { await api(`/cart/${b.dataset.id}`, { method: 'DELETE' }); loadCart(); });
  document.querySelectorAll('.inc').forEach((b) => b.onclick = async () => {
    const item = items.find((x) => String(x.id) === b.dataset.id);
    await api(`/cart/${b.dataset.id}`, { method: 'PUT', body: JSON.stringify({ quantity: item.quantity + 1 }) }); loadCart();
  });
  document.querySelectorAll('.dec').forEach((b) => b.onclick = async () => {
    const item = items.find((x) => String(x.id) === b.dataset.id);
    if (item.quantity <= 1) return;
    await api(`/cart/${b.dataset.id}`, { method: 'PUT', body: JSON.stringify({ quantity: item.quantity - 1 }) }); loadCart();
  });
}

loadCart().catch(console.error);
