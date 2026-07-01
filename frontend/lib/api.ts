import type { ApiError, EnvioEntregadoResponse, EnvioItemResponse, EnvioPanelResponse, Maleta, MetricasOperacion, ReporteSesion } from './types';
import { device } from './device';

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
  try {
    const { headers: extraHeaders, ...restOptions } = options || {};
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': device.getId(),
        ...(extraHeaders as Record<string, string>),
      },
      ...restOptions,
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
  post: <T>(path: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), headers }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('Timeout'), REQUEST_TIMEOUT_MS);
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'X-Device-Id': device.getId(),
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
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
          'X-Device-Id': device.getId(),
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

export async function fetchEnviosAeropuerto(sesionId: string, aeropuertoIata: string): Promise<EnvioItemResponse[]> {
  return api.get<EnvioItemResponse[]>(`/sesiones/${sesionId}/envios/nodo/${aeropuertoIata}`);
}

export async function fetchEntregadosRecientes(sesionId: string, horas = 4): Promise<EnvioEntregadoResponse[]> {
  return api.get<EnvioEntregadoResponse[]>(`/sesiones/${sesionId}/envios/entregados-recientes?horas=${horas}`);
}

export async function fetchEnviosVueloOperacion(vueloId: string): Promise<EnvioItemResponse[]> {
  return api.get<EnvioItemResponse[]>(`/vuelos/${vueloId}/equipajes`);
}

export async function fetchEnviosAeropuertoOperacion(aeropuertoIata: string): Promise<EnvioItemResponse[]> {
  return api.get<EnvioItemResponse[]>(`/nodos/${aeropuertoIata}/equipajes`);
}

export async function fetchEntregadosRecientesOperacion(horas = 4, desde?: string): Promise<EnvioEntregadoResponse[]> {
  let url = `/equipajes/recientes?horas=${horas}`;
  if (desde) url += `&desde=${encodeURIComponent(desde)}`;
  return api.get<EnvioEntregadoResponse[]>(url);
}

export async function fetchMetricasOperacion(desde?: string): Promise<MetricasOperacion> {
  const params = desde ? `?desde=${encodeURIComponent(desde)}` : '';
  return api.get<MetricasOperacion>(`/equipajes/metricas${params}`);
}

export async function fetchReporte(sesionId: string): Promise<ReporteSesion> {
  return api.get<ReporteSesion>(`/sesiones/${sesionId}/reporte`);
}

export async function descargarPlanViajePdf(equipajeId: string): Promise<void> {
  const blob = await api.downloadBlob(`/equipajes/${equipajeId}/plan-viaje/descargar`);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function fetchEnviosPanel(tipo: string, origen?: string, destino?: string): Promise<EnvioPanelResponse[]> {
  let url = `/equipajes/envios-panel?tipo=${encodeURIComponent(tipo)}`;
  if (origen) url += `&origen_iata=${encodeURIComponent(origen)}`;
  if (destino) url += `&destino_iata=${encodeURIComponent(destino)}`;
  return api.get<EnvioPanelResponse[]>(url);
}

export async function fetchEnviosPanelSesion(sesionId: string, tipo: string, origen?: string, destino?: string): Promise<EnvioPanelResponse[]> {
  let url = `/sesiones/${sesionId}/envios/envios-panel?tipo=${encodeURIComponent(tipo)}`;
  if (origen) url += `&origen_iata=${encodeURIComponent(origen)}`;
  if (destino) url += `&destino_iata=${encodeURIComponent(destino)}`;
  return api.get<EnvioPanelResponse[]>(url);
}

export async function fetchMaletasVuelo(vueloId: string): Promise<Maleta[]> {
  return api.get<Maleta[]>(`/vuelos/${vueloId}/maletas`);
}

export async function fetchMaletasEquipaje(idExternoEquipaje: string): Promise<Maleta[]> {
  return api.get<Maleta[]>(`/equipajes/${encodeURIComponent(idExternoEquipaje)}/maletas`);
}