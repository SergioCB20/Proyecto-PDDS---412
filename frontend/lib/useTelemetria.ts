'use client';

import { useEffect, useRef, useState } from 'react';
import type { TelemetriaMensaje } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/ws/telemetria';

export function useTelemetria(activo: boolean) {
  const [data, setData] = useState<TelemetriaMensaje | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activoRef = useRef(activo);

  useEffect(() => {
    activoRef.current = activo;
  }, [activo]);

  useEffect(() => {
    function conectar() {
      if (typeof window === 'undefined') return;
      if (!activoRef.current) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

      ws.onopen = () => setConnected(true);

      ws.onclose = () => {
        setConnected(false);
        if (activoRef.current) {
          reconnectRef.current = setTimeout(conectar, 3000);
        }
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
