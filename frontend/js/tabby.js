import { api } from './api.js';

export async function createTabbySession(orderId) {
  const data = await api('/payments/tabby/create-session', { method: 'POST', body: JSON.stringify({ order_id: orderId }) });
  const webUrl = data.web_url || data.configuration?.available_products?.installments?.[0]?.web_url;
  if (webUrl) location.href = webUrl;
  else alert('تعذر الانتقال إلى تابي');
}
