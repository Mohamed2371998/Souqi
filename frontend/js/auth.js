import { api } from './api.js';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    localStorage.setItem('token', data.token);
    location.href = '/index.html';
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: name.value, email: email.value, phone: phone.value, password: password.value, preferred_lang: preferred_lang.value }),
    });
    alert('تم إنشاء الحساب');
    location.href = '/pages/login.html';
  });
}
