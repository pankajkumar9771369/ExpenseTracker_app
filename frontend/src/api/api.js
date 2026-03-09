import axios from 'axios';

// All requests use relative paths → Vite proxies them to the correct service.
// This avoids CORS issues (browser treats them as same-origin).
//
// Proxy map (vite.config.js):
//   /auth    → http://localhost:9810  (authService)
//   /expense → http://localhost:9820  (expenseService)
//   /v1/ds   → http://localhost:8010  (dsService)

// ── Auth Service ──────────────────────────────────────────────
export const authApi = axios.create({ baseURL: '/' });

// ── Expense Service ───────────────────────────────────────────
export const expenseApi = axios.create({ baseURL: '/' });

expenseApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    if (userId) config.headers['X-User-Id'] = userId;
    return config;
});

// ── DS Service ────────────────────────────────────────────────
export const dsApi = axios.create({ baseURL: '/' });

dsApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    if (userId) config.headers['x-user-id'] = userId;
    return config;
});
