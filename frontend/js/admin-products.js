import { api } from './api.js';

async function loadProducts() {
  const products = await api('/products');
  document.getElementById('adminProductsList').innerHTML = products.map((p) => `<div class="card">
    <h4>${p.name_ar}</h4><p>${p.price_sar} ر.س | مخزون: ${p.stock_qty}</p>
    <button data-id="${p.id}" class="del">حذف</button>
  </div>`).join('');
  document.querySelectorAll('.del').forEach((b) => b.onclick = async () => { await api(`/products/${b.dataset.id}`, { method: 'DELETE' }); loadProducts(); });
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData();
  ['name_ar','name_en','category_id','price_sar','stock_qty','brand'].forEach((id) => fd.append(id, document.getElementById(id).value));
  fd.append('installment_eligible', document.getElementById('installment_eligible').checked ? '1' : '0');
  const file = document.getElementById('image').files[0];
  if (file) fd.append('image', file);

  const token = localStorage.getItem('token');
  const res = await fetch('http://localhost:4000/api/products', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  if (!res.ok) return alert('فشل الحفظ');
  alert('تم الحفظ');
  e.target.reset();
  loadProducts();
});

loadProducts();
