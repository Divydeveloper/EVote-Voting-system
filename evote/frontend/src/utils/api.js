// src/utils/api.js
// Central Axios instance with auth headers & interceptors

import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://evote-backend-83mn.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach JWT ──────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('evote_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ────────
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';

    if (error.response?.status === 401 && error.response?.data?.expired) {
      localStorage.removeItem('evote_token');
      localStorage.removeItem('evote_user');
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default API;
