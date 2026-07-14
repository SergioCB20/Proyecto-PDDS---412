'use client';

import { useEffect, useState } from 'react';

/** Reloj de pared que se actualiza cada segundo. */
export function useReloj() {
  const [hora, setHora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return hora;
}
