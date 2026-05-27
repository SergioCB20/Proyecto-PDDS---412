import type { ApiError } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({
      status: res.status,
      error: 'ERROR',
      mensaje: res.statusText,
    }));
    throw error;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  upload: <T>(path: string, formData: FormData) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error: ApiError = await res.json().catch(() => ({
          status: res.status,
          error: 'ERROR',
          mensaje: res.statusText,
        }));
        throw error;
      }
      return res.json() as Promise<T>;
    });
  },
  downloadBlob: async (path: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({
        status: res.status,
        error: 'ERROR',
        mensaje: res.statusText,
      }));
      throw error;
    }
    return res.blob();
  },
};