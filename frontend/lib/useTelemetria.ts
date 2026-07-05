'use client';

import { useEffect, useRef, useState } from 'react';
import type { TelemetriaMensaje } from './types';

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8080/api/ws/telemetria';
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  if (isLocal) {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    return base.replace(/^http/, 'ws').replace(/\/api$/, '') + '/api/ws/telemetria';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/back/api/ws/telemetria`;
}

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

      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => setConnected(true);

      ws.onclose = () => {
        setConnected(false);
        if (activoRef.current) {
          reconnectRef.current = setTimeout(conectar, 3000);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'heartbeat') return;
          setData(msg as TelemetriaMensaje);
        } catch {
          /* ignore parse errors */
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    if (!activo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      return;
    }
    setData(null);
    conectar();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current = null;
      setConnected(false);
      setData(null);
    };
  }, [activo]);

  return { data, connected };
}
