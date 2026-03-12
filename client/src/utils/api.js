/**
 * API Service - Axios-based API client
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
    `/api/build/download/${buildId}`,

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

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (email, password) =>
    api.post('/auth/register', { email, password })
};

export default api;
