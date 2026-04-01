/**
 * Axios HTTP client instance with JWT interceptor.
 * All API calls go through this configured instance.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || '/api') 
  : 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT token ──
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle auth errors ──
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dr_token');
      localStorage.removeItem('dr_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
export { API_BASE_URL };
