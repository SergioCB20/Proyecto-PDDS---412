import type { ApiError, EnvioEntregadoResponse, EnvioItemResponse } from './types';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    }
    return '/back/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
}

const BASE_URL = getBaseUrl();
const REQUEST_TIMEOUT_MS = 120_000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('Timeout'), REQUEST_TIMEOUT_MS);
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
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw {
        status: 408,
        error: 'TIMEOUT',
        mensaje: 'La operación tardó demasiado. Verifique la conexión e intente nuevamente.',
      } satisfies ApiError;
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
  upload: <T>(path: string, formData: FormData) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Timeout'), REQUEST_TIMEOUT_MS);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
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
    }).catch((err) => {
      if (err instanceof DOMException && err.name === 'AbortError') {
        const error: ApiError = {
          status: 408,
          error: 'TIMEOUT',
          mensaje: 'La operación tardó demasiado. Verifique la conexión e intente nuevamente.',
        };
        throw error;
      }
      throw err;
    }).finally(() => clearTimeout(timeoutId));
  },
  downloadBlob: async (path: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Timeout'), REQUEST_TIMEOUT_MS);
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
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw {
          status: 408,
          error: 'TIMEOUT',
          mensaje: 'La operación tardó demasiado. Verifique la conexión e intente nuevamente.',
        } satisfies ApiError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

export async function fetchEnviosVuelo(sesionId: string, vueloId: string): Promise<EnvioItemResponse[]> {
  return api.get<EnvioItemResponse[]>(`/sesiones/${sesionId}/envios/vuelo/${vueloId}`);
}

export async function fetchEnviosNodo(sesionId: string, nodoIata: string): Promise<EnvioItemResponse[]> {
  return api.get<EnvioItemResponse[]>(`/sesiones/${sesionId}/envios/nodo/${nodoIata}`);
}

export async function fetchEntregadosRecientes(sesionId: string, horas = 4): Promise<EnvioEntregadoResponse[]> {
  return api.get<EnvioEntregadoResponse[]>(`/sesiones/${sesionId}/envios/entregados-recientes?horas=${horas}`);
}