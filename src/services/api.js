import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function request(method, path, body = null) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Error de red'), { status: res.status, data: err });
  }

  if (res.status === 204) return null;
  return res.json();
}

/**
 * Petición que devuelve binario (p. ej. PDF). Los navegadores no permiten body en GET;
 * para PDF con payload JSON usar method POST aunque el recurso sea una “descarga”.
 */
export async function fetchBinary(method, path, body = null) {
  const token = await getToken();
  const headers = {};
  if (body != null) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.error || j.message || msg;
    } catch {
      /* texto plano */
    }
    throw Object.assign(new Error(msg || 'Error de red'), { status: res.status });
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get('Content-Disposition') || '';
  return { blob, contentDisposition };
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path, body) => request('DELETE', path, body),
};

export { supabase };
