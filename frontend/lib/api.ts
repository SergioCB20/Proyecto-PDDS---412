import type { ApiError } from './types';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    }
    return '/back/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
}

const BASE_URL = getBaseUrl();
const REQUEST_TIMEOUT_MS = 30_000;

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

const TIMEOUT_ERROR = { status: 408, error: 'TIMEOUT', mensaje: 'La operación tardó demasiado. Verifique la conexión e intente nuevamente.' };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
      signal: options?.signal ?? controller.signal,
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
  } catch (err) {
    if (isAbortError(err)) {
      throw TIMEOUT_ERROR;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, formData: FormData) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: formData,
      });
      if (!res.ok) {
        const error: ApiError = await res.json().catch(() => ({
          status: res.status,
          error: 'ERROR',
          mensaje: res.statusText,
        }));
        throw error;
      }
      return res.json() as Promise<T>;
    } catch (err) {
      if (isAbortError(err)) {
        throw TIMEOUT_ERROR;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  downloadBlob: async (path: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
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
    } catch (err) {
      if (isAbortError(err)) {
        throw TIMEOUT_ERROR;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};