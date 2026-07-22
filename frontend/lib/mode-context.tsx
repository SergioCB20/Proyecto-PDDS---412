'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type DashboardMode = 'operacion' | 'simulacion' | 'colapso';

interface ModeContextValue {
  mode: DashboardMode;
  setMode: (m: DashboardMode) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

/** Provee el modo activo (Operación / Simulación / Colapso) para que la barra
 *  superior y el dashboard lo compartan. */
export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DashboardMode>('operacion');
  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode debe usarse dentro de <ModeProvider>');
  return ctx;
}
