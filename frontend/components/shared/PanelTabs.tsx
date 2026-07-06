'use client';

import { useReducer, useEffect } from 'react';
import { PanelAeropuertosOperacion } from '@/components/operacion/PanelAeropuertosOperacion';
import { PanelVuelosOperacion } from '@/components/operacion/PanelVuelosOperacion';
import { PanelEnviosMaletas } from '@/components/shared/PanelEnviosMaletas';
import type { AeropuertoTelemetria, VueloTelemetria, SegmentoResponse } from '@/lib/types';

type TabName = 'aeropuertos' | 'vuelos' | 'envios';

interface PanelTabsProps {
  aeropuertos: AeropuertoTelemetria[];
  vuelosAeropuerto: VueloTelemetria[];
  onAeropuertoClick?: (id: string, codigo: string) => void;
  vuelos: VueloTelemetria[];
  onVueloClick?: (id: string, codigo: string) => void;
  onDownloadManifiesto?: (id: string, codigo: string) => void;
  onCancelVuelo?: (id: string, codigo: string) => void;
  onVerEnMapa?: (id: string) => void;
  seguidoVueloId?: string;
  onAeropuertoVerEnMapa?: (id: string) => void;
  seguidoAeropuertoId?: string;
  aeropuertoSeleccionadoId?: string;
  vueloFilterOrigen: string;
  vueloFilterDestino: string;
  onVueloFilterChange: (filters: { origen: string; destino: string }) => void;
  sesionId?: string;
  enviosActivo: boolean;
  nodos: { codigo_iata: string; nombre: string }[];
  onSeguirEnMapa?: (vueloId: string) => void;
  onMostrarRuta?: (segmentos: SegmentoResponse[]) => void;
  filtroColor?: string;
  onFilterColorChange?: (color: string) => void;
  umbralesConfig?: { verdeMax: number; ambarMax: number };
}

const TAB_LABELS: Record<TabName, string> = {
  aeropuertos: 'Aeropuertos',
  vuelos: 'Vuelos',
  envios: 'Envíos de Maletas',
};

export function PanelTabs({
  aeropuertos,
  vuelosAeropuerto,
  onAeropuertoClick,
  vuelos,
  onVueloClick,
  onDownloadManifiesto,
  onCancelVuelo,
  onVerEnMapa,
  seguidoVueloId,
  onAeropuertoVerEnMapa,
  seguidoAeropuertoId,
  aeropuertoSeleccionadoId,
  vueloFilterOrigen,
  vueloFilterDestino,
  onVueloFilterChange,
  sesionId,
  enviosActivo,
  nodos,
  onSeguirEnMapa,
  onMostrarRuta,
  filtroColor,
  onFilterColorChange,
  umbralesConfig,
}: PanelTabsProps) {
  const [tab, setTab] = useReducer((_: TabName, next: TabName) => next, 'aeropuertos' as TabName);

  useEffect(() => {
    if (aeropuertoSeleccionadoId) {
      setTab('aeropuertos');
    }
  }, [aeropuertoSeleccionadoId]);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      <div className="flex gap-1 p-4 pb-0">
        {(Object.entries(TAB_LABELS) as [TabName, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 text-[11px] font-medium py-1.5 px-1 rounded-md transition-colors ${
              tab === key
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'aeropuertos' && (
        <PanelAeropuertosOperacion
          aeropuertos={aeropuertos}
          onAeropuertoClick={onAeropuertoClick}
          onVerEnMapa={onAeropuertoVerEnMapa}
          seguidoId={seguidoAeropuertoId}
          seleccionadoId={aeropuertoSeleccionadoId}
          filtroColor={filtroColor}
          onFilterColorChange={onFilterColorChange}
          umbralesConfig={umbralesConfig}
        />
      )}

      {tab === 'vuelos' && (
        <PanelVuelosOperacion
          vuelos={vuelos}
          onVueloClick={onVueloClick}
          onDownloadManifiesto={onDownloadManifiesto}
          onCancelVuelo={onCancelVuelo}
          onVerEnMapa={onVerEnMapa}
          seguidoId={seguidoVueloId}
          origenFilter={vueloFilterOrigen}
          destinoFilter={vueloFilterDestino}
          onFilterChange={onVueloFilterChange}
          filtroColor={filtroColor}
          umbralesConfig={umbralesConfig}
        />
      )}

      {tab === 'envios' && (
        <PanelEnviosMaletas
          sesionId={sesionId}
          activo={enviosActivo}
          nodos={nodos}
          onSeguirEnMapa={onSeguirEnMapa}
          onMostrarRuta={onMostrarRuta}
        />
      )}
    </div>
  );
}
