import { api, formatSARArabic } from './api.js';

const grid = document.getElementById('productsGrid');

function card(p) {
  const tamara = (Number(p.price_sar) / 3).toFixed(2);
  const tabby = (Number(p.price_sar) / 4).toFixed(2);
  return `<article class="product-card">
    <img src="${p.image_url || 'https://placehold.co/320x220'}"/>
    <h4>${p.name_ar}</h4>
    <p>${formatSARArabic(p.price_sar)}</p>
    <small>يشمل ضريبة القيمة المضافة</small>
    ${p.installment_eligible ? `<div class="badge-bnpl">٣ دفعات × ${tamara} ر.س | ٤ دفعات × ${tabby} ر.س</div>` : ''}
    <div style="display:flex;gap:8px;margin-top:8px"><button class="btn addCart" data-id="${p.id}">أضف للسلة</button><a class="btn secondary" href="/pages/product.html?id=${p.id}">تفاصيل</a></div>
  </article>`;
}

async function loadCategories() {
  const c = await api('/categories');
  const select = document.getElementById('categoryFilter');
  select.innerHTML = '<option value="">كل التصنيفات</option>' + c.map((x) => `<option value="${x.id}">${x.name_ar}</option>`).join('');
}

async function loadProducts() {
  const params = new URLSearchParams();
  const val = (id) => document.getElementById(id)?.value;
  if (val('categoryFilter')) params.append('category', val('categoryFilter'));
  if (val('priceMin')) params.append('price_min', val('priceMin'));
  if (val('priceMax')) params.append('price_max', val('priceMax'));
  if (val('brandFilter')) params.append('brand', val('brandFilter'));
  if (val('searchInput')) params.append('search', val('searchInput'));
  params.append('sort', val('sortSelect') || 'latest');
  if (document.getElementById('bnplFilter')?.checked) params.append('installment_eligible', 'true');

  const rows = await api(`/products?${params.toString()}`);
  grid.innerHTML = rows.map(card).join('');
  document.querySelectorAll('.addCart').forEach((btn) => btn.onclick = async () => {
    try { await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: Number(btn.dataset.id), quantity: 1 }) }); alert('تمت الإضافة'); }
    catch (e) { alert(e.message); }
  });
}

document.getElementById('applyFilters')?.addEventListener('click', loadProducts);
document.getElementById('sortSelect')?.addEventListener('change', loadProducts);
loadCategories().then(loadProducts).catch(console.error);
