/**
 * Repo2APK frontend API.
 * Authentication and APK builds use Supabase Auth + the repo2apk-api Edge Function.
 */

import axios from 'axios';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const FUNCTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/repo2apk-api` : '';
const PAYMENT_FUNCTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/repo2apk-payments` : '';
const SESSION_KEY = 'repo2apk_supabase_session';
const LEGACY_API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const legacyApi = axios.create({
  baseURL: LEGACY_API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

function requireSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Please contact the site administrator.');
  }
}

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (session?.expires_at && session.expires_at * 1000 <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) {
    const stored = { ...session };
    if (!stored.expires_at && stored.expires_in) stored.expires_at = Math.floor(Date.now() / 1000) + stored.expires_in;
    localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
  } else localStorage.removeItem(SESSION_KEY);
}

async function supabaseAuth(path, payload) {
  requireSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || 'Authentication failed.');
  return data;
}

async function functionRequest(action, payload = {}, method = 'POST') {
  requireSupabaseConfig();
  const session = readSession();
  if (!session?.access_token) throw new Error('Please sign in to continue.');
  const url = new URL(FUNCTION_URL);
  if (method === 'GET') {
    url.searchParams.set('action', action);
    if (payload.buildId) url.searchParams.set('buildId', payload.buildId);
  }
  const response = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
    },
    ...(method === 'POST' ? { body: JSON.stringify({ action, ...payload }) } : {})
  });
  if (response.redirected && action === 'download') return { downloadUrl: response.url };
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status}).`);
  return data;
}

export const authApi = {
  login: async (email, password) => {
    const data = await supabaseAuth('token?grant_type=password', { email, password });
    saveSession(data);
    return { ...data, token: data.access_token };
  },
  register: async (email, password) => {
    const data = await supabaseAuth('signup', { email, password });
    if (data.access_token) saveSession(data);
    else throw new Error('Account created. Check your email to confirm the account, then sign in.');
    return { ...data, token: data.access_token };
  },
  signOut: () => saveSession(null),
  getSession: () => readSession()
};

export const buildApi = {
  startBuild: (repoUrl, buildType = 'auto') => functionRequest('start', { repoUrl, buildType }),
  getStatus: (buildId) => functionRequest('status', { buildId }, 'GET'),
  getHistory: async () => {
    const data = await functionRequest('history', {}, 'GET');
    return { builds: (data.builds || []).map(build => ({
      ...build,
      buildId: build.id,
      repoUrl: build.repo_url,
      projectType: build.project_type || build.build_type,
      startedAt: build.created_at,
      downloadUrl: build.status === 'success' ? buildApi.getDownloadUrl(build.id) : null
    })) };
  },
  getDownloadUrl: (buildId) => `${FUNCTION_URL}?action=download&buildId=${encodeURIComponent(buildId)}`,
  downloadBuild: async (buildId) => {
    requireSupabaseConfig();
    const session = readSession();
    if (!session?.access_token) throw new Error('Please sign in to download this APK.');
    const response = await fetch(`${FUNCTION_URL}?action=download&buildId=${encodeURIComponent(buildId)}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Could not download the APK.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'repo2apk-build.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
};

async function paymentRequest(action, payload = {}, needsSession = true) {
  requireSupabaseConfig();
  const session = readSession();
  if (needsSession && !session?.access_token) throw new Error('Please sign in to continue.');
  const response = await fetch(PAYMENT_FUNCTION_URL, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `Payment request failed (${response.status}).`);
  return data;
}

export const paymentApi = {
  getConfig: () => paymentRequest('config', {}, false),
  getEntitlement: () => paymentRequest('entitlement'),
  checkout: (plan) => paymentRequest('checkout', { plan })
};

export default legacyApi;
