'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { TelemetriaMensaje } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/ws/telemetria';

export function useTelemetria(activo: boolean) {
  const [data, setData] = useState<TelemetriaMensaje | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conectar = useCallback(() => {
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
        setData(msg);
      } catch {
        /* ignore parse errors */
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    if (activo) {
      conectar();
    } else {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      setConnected(false);
    }
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current = null;
    };
  }, [activo, conectar]);

  return { data, connected };
}
