import axios from 'axios';

// Ensure the base URL always ends with a trailing slash for relative path resolution
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || '/api/') 
  : 'http://localhost:5000/api/';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add the JWT token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('dr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
