'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Posicion {
  lat: number;
  lon: number;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function useAnimacionVuelo(
  targetPos: Posicion | null,
  duracionMs = 4500
): Posicion {
  const [currentPos, setCurrentPos] = useState<Posicion>(
    targetPos ?? { lat: 0, lon: 0 }
  );

  const animRef = useRef<{
    startPos: Posicion;
    targetPos: Posicion;
    startTime: number;
  } | null>(null);

  const frameRef = useRef<number>(0);

  const animate = useCallback(() => {
    const anim = animRef.current;
    if (!anim) return;

    const elapsed = Date.now() - anim.startTime;
    const t = Math.min(elapsed / duracionMs, 1);
    const eased = easeInOutQuad(t);

    const lat = anim.startPos.lat + (anim.targetPos.lat - anim.startPos.lat) * eased;
    const lon = anim.startPos.lon + (anim.targetPos.lon - anim.startPos.lon) * eased;

    setCurrentPos({ lat, lon });

    if (t < 1) {
      frameRef.current = requestAnimationFrame(animate);
    } else {
      setCurrentPos({ ...anim.targetPos });
    }
  }, [duracionMs]);

  useEffect(() => {
    if (!targetPos) return;

    const prev = animRef.current;
    if (
      prev &&
      prev.targetPos.lat === targetPos.lat &&
      prev.targetPos.lon === targetPos.lon
    ) {
      return;
    }

    animRef.current = {
      startPos: { ...currentPos },
      targetPos: { ...targetPos },
      startTime: Date.now(),
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [targetPos?.lat, targetPos?.lon, animate, currentPos]);

  useEffect(() => {
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return currentPos;
}
