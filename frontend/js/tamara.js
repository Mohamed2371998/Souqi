import { api } from './api.js';

export async function createTamaraSession(orderId) {
  const data = await api('/payments/tamara/create-session', { method: 'POST', body: JSON.stringify({ order_id: orderId }) });
  if (data.checkout_url) location.href = data.checkout_url;
  else alert('تعذر الانتقال إلى تمارا');
}
