function getDefaultApiBase() {
  const { protocol, hostname } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocal) return 'http://localhost:4000/api';

  const rootHost = hostname.replace(/^www\./, '');
  return `${protocol}//api.${rootHost}/api`;
}

export const API_BASE = window.SOUQI_CONFIG?.API_BASE || getDefaultApiBase();

export function getToken() {
  return localStorage.getItem('token');
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function formatSAR(value) {
  const n = Number(value || 0);
  return `SAR ${n.toFixed(2)}`;
}

export function formatSARArabic(value) {
  return `${Number(value || 0).toLocaleString('ar-SA')} ر.س`;
}
