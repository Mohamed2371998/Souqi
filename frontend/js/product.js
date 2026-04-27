import { api, formatSARArabic } from './api.js';

const id = new URLSearchParams(location.search).get('id');

async function load() {
  const p = await api(`/products/${id}`);
  document.getElementById('productDetail').innerHTML = `
    <article class="card">
      <img src="${p.image_url || 'https://placehold.co/500x300'}" style="width:100%;max-width:500px;border-radius:12px"/>
      <h1>${p.name_ar}</h1>
      <p>${p.description_ar || ''}</p>
      <h3>${formatSARArabic(p.price_sar)} <small>يشمل ضريبة القيمة المضافة</small></h3>
      ${p.installment_eligible ? `<div class="badge-bnpl">قسّمها على 3 دفعات بدون فوائد • Tamara</div><div class="badge-bnpl">قسّمها على 4 دفعات بدون فوائد • Tabby</div>` : ''}
      <button id="addCart" class="btn">أضف إلى السلة</button>
      <button id="buyNow" class="btn secondary">اشتر الآن</button>
    </article>`;

  document.getElementById('addCart').onclick = () => api('/cart', { method: 'POST', body: JSON.stringify({ product_id: Number(id), quantity: 1 }) }).then(() => alert('تمت الإضافة'));
  document.getElementById('buyNow').onclick = async () => {
    await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: Number(id), quantity: 1 }) });
    location.href = '/pages/checkout.html';
  };

  const reviews = await api(`/reviews/product/${id}`);
  document.getElementById('reviewsList').innerHTML = reviews.map((r) => `<div class="card"><strong>${'★'.repeat(r.rating)}</strong><p>${r.comment || ''}</p><small>${r.name}</small></div>`).join('');
}

document.getElementById('reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/reviews', {
    method: 'POST',
    body: JSON.stringify({ product_id: Number(id), rating: Number(document.getElementById('rating').value), comment: document.getElementById('comment').value }),
  });
  alert('تم إرسال التقييم');
  load();
});

load().catch(console.error);
