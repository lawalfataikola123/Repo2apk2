/**
 * API Service - Axios-based API client
 */

import axios from 'axios';

// Set VITE_API_BASE_URL to the deployed API origin + /api when frontend and API
// are hosted separately. Leave unset for same-origin hosting/development proxy.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error
      || error.response?.data?.message
      || error.message
      || 'Network error';
    return Promise.reject(new Error(message));
  }
);

// ─── Build API ────────────────────────────────────────────────────────────────
export const buildApi = {
  /**
   * Start a new APK build
   */
  startBuild: (repoUrl, buildType = 'auto') =>
    api.post('/build', { repoUrl, buildType }),

  /**
   * Get build status and logs
   */
  getStatus: (buildId) =>
    api.get(`/build/status/${buildId}`),

  /**
   * Get download URL
   */
  getDownloadUrl: (buildId) =>
    `${API_BASE_URL}/build/download/${buildId}`,

  /**
   * Get build history
   */
  getHistory: () =>
    api.get('/build/history'),

  /**
   * Delete a build
   */
  deleteBuild: (buildId) =>
    api.delete(`/build/${buildId}`)
};

// ─── Flutterwave Payments API ────────────────────────────────────────────────
export const paymentApi = {
  getConfig: () => api.get('/payment/config'),
  getEntitlement: () => api.get('/payment/entitlement'),
  checkout: (plan) => api.post('/payment/checkout', { plan })
};

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (email, password) =>
    api.post('/auth/register', { email, password })
};

export default api;
