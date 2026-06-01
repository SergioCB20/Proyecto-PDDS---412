'use client';

import { useEffect, useRef, useState } from 'react';
import type { TelemetriaMensaje } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/ws/telemetria';

export function useTelemetria(activo: boolean, sesionId?: string) {
  const [data, setData] = useState<TelemetriaMensaje | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sesionIdRef = useRef(sesionId);
  sesionIdRef.current = sesionId;

  useEffect(() => {
    function conectar() {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      if (!token) return;

      const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

      ws.onopen = () => setConnected(true);

      ws.onclose = () => {
        setConnected(false);
        reconnectRef.current = setTimeout(conectar, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as TelemetriaMensaje;
          if (sesionIdRef.current && msg.metricas_sesion?.sesion_id !== sesionIdRef.current) return;
          console.log('[WS] telemetry received:', {
            nodos: msg.nodos?.length ?? 0,
            vuelos: msg.vuelos?.length ?? 0,
            estado: msg.metricas_sesion?.estado,
            timestamp: msg.timestamp
          });
          setData(msg);
        } catch (e) {
          console.warn('[WS] parse error:', e);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    if (activo) {
      conectar();
    }
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current = null;
      setConnected(false);
    };
  }, [activo]);

  return { data, connected };
}
