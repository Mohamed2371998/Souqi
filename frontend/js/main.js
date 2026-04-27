import { api, formatSARArabic } from './api.js';

async function init() {
  const categories = await api('/categories');
  const products = await api('/products?sort=latest');
  const categoriesGrid = document.getElementById('categoriesGrid');
  const featuredGrid = document.getElementById('featuredGrid');

  categoriesGrid.innerHTML = categories.map((c) => `<article class="card"><h4>${c.name_ar}</h4><p>${c.description_ar || ''}</p></article>`).join('');
  featuredGrid.innerHTML = products.filter((p) => p.is_featured).slice(0, 8).map((p) => `
    <article class="product-card">
      <img src="${p.image_url || 'https://placehold.co/320x220'}" alt="${p.name_ar}"/>
      <h4>${p.name_ar}</h4>
      <p>${formatSARArabic(p.price_sar)} <small>يشمل ضريبة القيمة المضافة</small></p>
      ${p.installment_eligible ? '<span class="badge-bnpl">قسّمها بدون فوائد</span>' : ''}
      <a class="btn" href="/pages/product.html?id=${p.id}">عرض</a>
    </article>
  `).join('');
}

init().catch(console.error);
