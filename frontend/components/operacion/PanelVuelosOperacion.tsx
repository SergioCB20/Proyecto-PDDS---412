'use client';

import { useState, useMemo } from 'react';
import { Upload, XCircle, Map as MapIcon, PlaneTakeoff, PlaneLanding, X, Copy, Check, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { colorVueloPorEstado } from '@/lib/colors';
import type { VueloTelemetria, Maleta } from '@/lib/types';
import { formatearFechaHoraSeparado } from '@/lib/formatearHora';
import { fetchMaletasVuelo } from '@/lib/api';
import { ciudadDe, etiquetaFiltroAeropuerto } from '@/lib/aeropuertos';

interface PanelVuelosOperacionProps {
  vuelos: VueloTelemetria[];
  onVueloClick?: (id: string, codigo: string) => void;
  onDownloadManifiesto?: (id: string, codigo: string) => void;
  onCancelVuelo?: (id: string, codigo: string) => void;
  onVerEnMapa?: (id: string) => void;
  seguidoId?: string;
  origenFilter?: string;
  destinoFilter?: string;
  onFilterChange?: (filters: { origen: string; destino: string }) => void;
}

// Tope de tarjetas montadas en el DOM. El filtrado opera sobre la lista
// completa; solo se acota cuántas se renderizan a la vez para no saturar la
// pestaña cuando la telemetría trae muchos vuelos.
const MAX_RENDER = 100;

// Un vuelo PROGRAMADO aún no ha embarcado: la carga real se fija al despegar. La reserva que
// el planificador hace por adelantado (baja carga_disponible) es transitoria y se re-ajusta
// cada ciclo, así que no se muestra ocupación hasta que el vuelo está EN_RUTA/COMPLETADO.
function cargaOcupada(v: VueloTelemetria): number {
  if (v.estado === 'PROGRAMADO') return 0;
  return Math.max(0, v.capacidad_carga - v.carga_disponible);
}

export function PanelVuelosOperacion({ vuelos, onVueloClick, onDownloadManifiesto, onCancelVuelo, onVerEnMapa, seguidoId, origenFilter = '', destinoFilter = '', onFilterChange }: PanelVuelosOperacionProps) {
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [orden, setOrden] = useState('');

  // Estado del modal "Ver Maletas"
  const [maletasModal, setMaletasModal] = useState<{ vueloId: string; vueloCodigo: string } | null>(null);
  const [maletas, setMaletas] = useState<Maleta[]>([]);
  const [maletasLoading, setMaletasLoading] = useState(false);
  const [maletasError, setMaletasError] = useState<string | null>(null);
  const [maletaCopiada, setMaletaCopiada] = useState<string | null>(null);

  const handleAbrirMaletas = async (vueloId: string, vueloCodigo: string) => {
    setMaletasModal({ vueloId, vueloCodigo });
    setMaletas([]);
    setMaletasLoading(true);
    setMaletasError(null);
    try {
      const lista = await fetchMaletasVuelo(vueloId);
      setMaletas(lista);
    } catch (err) {
      const e = err as { mensaje?: string; message?: string };
      setMaletasError(e.mensaje || e.message || 'Error al cargar las maletas del vuelo');
      setMaletas([]);
    } finally {
      setMaletasLoading(false);
    }
  };

  const handleCerrarMaletas = () => {
    setMaletasModal(null);
    setMaletas([]);
    setMaletasError(null);
    setMaletaCopiada(null);
  };

  const handleCopiarMaleta = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setMaletaCopiada(codigo);
      setTimeout(() => setMaletaCopiada((curr) => (curr === codigo ? null : curr)), 1500);
    } catch {
      // Browser sin clipboard API, fallback silencioso
    }
  };

  // Agrupa las maletas por equipaje para presentacion clara.
  const maletasPorEquipaje = useMemo(() => {
    const map = new Map<string, Maleta[]>();
    for (const m of maletas) {
      const key = m.equipaje_id_externo ?? m.equipaje_id;
      const existing = map.get(key);
      if (existing) existing.push(m);
      else map.set(key, [m]);
    }
    return Array.from(map.entries());
  }, [maletas]);

  const opcionesOrigen = useMemo(() => {
    const set = new Set(vuelos.map(v => v.origen_iata));
    return Array.from(set).sort().map(iata => ({ value: iata, label: etiquetaFiltroAeropuerto(iata) }));
  }, [vuelos]);

  const opcionesDestino = useMemo(() => {
    const set = new Set(vuelos.map(v => v.destino_iata));
    return Array.from(set).sort().map(iata => ({ value: iata, label: etiquetaFiltroAeropuerto(iata) }));
  }, [vuelos]);

  const vuelosFiltrados = useMemo(() => {
    return vuelos.filter(v => {
      if (filtroCodigo && !v.codigo_vuelo.toLowerCase().includes(filtroCodigo.toLowerCase())) return false;
      if (origenFilter && v.origen_iata !== origenFilter) return false;
      if (destinoFilter && v.destino_iata !== destinoFilter) return false;
      return true;
    });
  }, [vuelos, filtroCodigo, origenFilter, destinoFilter]);

  const opcionesOrden = [
    { value: '', label: 'Sin orden' },
    { value: 'ocupacion-asc', label: 'Ocupación ↑' },
    { value: 'ocupacion-desc', label: 'Ocupación ↓' },
    { value: 'hora-salida', label: 'Hora salida' },
    { value: 'hora-llegada', label: 'Hora llegada' },
    { value: 'origen-az', label: 'Origen (A-Z)' },
    { value: 'destino-az', label: 'Destino (A-Z)' },
  ];

  const vuelosOrdenados = useMemo(() => {
    const lista = [...vuelosFiltrados];
    switch (orden) {
      case 'ocupacion-asc':
        lista.sort((a, b) => cargaOcupada(a) - cargaOcupada(b));
        break;
      case 'ocupacion-desc':
        lista.sort((a, b) => cargaOcupada(b) - cargaOcupada(a));
        break;
      case 'hora-salida':
        lista.sort((a, b) => a.hora_salida.localeCompare(b.hora_salida));
        break;
      case 'hora-llegada':
        lista.sort((a, b) => a.hora_llegada.localeCompare(b.hora_llegada));
        break;
      case 'origen-az':
        lista.sort((a, b) => a.origen_iata.localeCompare(b.origen_iata));
        break;
      case 'destino-az':
        lista.sort((a, b) => a.destino_iata.localeCompare(b.destino_iata));
        break;
    }
    return lista;
  }, [vuelosFiltrados, orden]);

  const vuelosVisibles = useMemo(
    () => vuelosOrdenados.slice(0, MAX_RENDER),
    [vuelosOrdenados]
  );

  const hayFiltrosActivos = filtroCodigo || origenFilter || destinoFilter;

  const limpiarFiltros = () => {
    setFiltroCodigo('');
    onFilterChange?.({ origen: '', destino: '' });
  };

  if (vuelos.length === 0) {
    return (
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Vuelos</h3>
        <p className="text-xs text-slate-400 italic text-center py-2">Sin datos de vuelos</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Vuelos</h3>
        <span className="text-xs text-slate-400">
          Mostrando {vuelosFiltrados.length} de {vuelos.length} vuelos
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex-1 min-w-[100px]">
          <Input
            placeholder="Código..."
            value={filtroCodigo}
            onChange={e => setFiltroCodigo(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[100px]">
          <Select
            placeholder="Origen"
            options={opcionesOrigen}
            value={origenFilter}
            onChange={e => onFilterChange?.({ origen: e.target.value, destino: destinoFilter })}
          />
        </div>
        <div className="flex-1 min-w-[100px]">
          <Select
            placeholder="Destino"
            options={opcionesDestino}
            value={destinoFilter}
            onChange={e => onFilterChange?.({ origen: origenFilter, destino: e.target.value })}
          />
        </div>
      </div>

      {hayFiltrosActivos && (
        <button
          onClick={limpiarFiltros}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-2 underline"
        >
          Limpiar filtros
        </button>
      )}

      <div className="mb-3">
        <Select
          placeholder="Ordenar por..."
          options={opcionesOrden}
          value={orden}
          onChange={e => setOrden(e.target.value)}
        />
      </div>

      {vuelosFiltrados.length > MAX_RENDER && (
        <p className="text-[11px] text-slate-400 mb-2">
          Mostrando las primeras {MAX_RENDER}; refina los filtros para ver el resto.
        </p>
      )}

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {vuelosVisibles.map(v => {
          const ocupada = cargaOcupada(v);
          const pct = v.capacidad_carga > 0 ? (ocupada / v.capacidad_carga) * 100 : 0;
          const colorHex = colorVueloPorEstado(v.estado);
          return (
            <div
              key={v.id}
              className="py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700/50 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shadow-sm animate-pulse" style={{ backgroundColor: colorHex }} />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{v.codigo_vuelo}</span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${colorHex}15`, color: colorHex }}
                  >
                    {v.estado === 'EN_RUTA' ? 'En Ruta' : v.estado === 'PROGRAMADO' ? 'Programado' : v.estado === 'CANCELADO' ? 'Cancelado' : 'Completado'}
                  </span>
                </div>
                <span
                  className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[170px]"
                  title={`${v.origen_iata} → ${v.destino_iata}`}
                >
                  {ciudadDe(v.origen_iata)} &rarr; {ciudadDe(v.destino_iata)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                <span>Carga: {ocupada} / {v.capacidad_carga}</span>
                <span className="font-semibold" style={{ color: colorHex }}>{pct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: colorHex }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {(() => {
                  const salida = formatearFechaHoraSeparado(v.hora_salida);
                  const llegada = formatearFechaHoraSeparado(v.hora_llegada);
                  return (
                    <>
                      <div className="flex items-center gap-1.5 rounded-md bg-white/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/50 px-2 py-1.5">
                        <PlaneTakeoff size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium">Salida</span>
                          <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {salida.hora}
                            <span className="text-slate-400 dark:text-slate-500 font-normal"> · {salida.fecha}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-md bg-white/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/50 px-2 py-1.5">
                        <PlaneLanding size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium">Llegada</span>
                          <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {llegada.hora}
                            <span className="text-slate-400 dark:text-slate-500 font-normal"> · {llegada.fecha}</span>
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1.5 gap-2">
                <div className="flex gap-1.5">
                  {onVueloClick && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onVueloClick(v.id, v.codigo_vuelo); }}
                      className="px-2.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-medium transition-colors cursor-pointer border border-transparent dark:border-blue-900/30"
                    >
                      Ver Envíos
                    </button>
                  )}
                  {onDownloadManifiesto && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAbrirMaletas(v.id, v.codigo_vuelo); }}
                      className="px-2.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium transition-colors cursor-pointer border border-transparent dark:border-emerald-900/30"
                      title="Ver IDs individuales de las maletas asignadas a este vuelo"
                    >
                      Ver Maletas
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {seguidoId === v.id ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium whitespace-nowrap">
                      En Mapa [ESC]
                    </span>
                  ) : onVerEnMapa && v.estado === 'EN_RUTA' && (
                    <button
                      onClick={e => { e.stopPropagation(); onVerEnMapa(v.id); }}
                      className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 transition-colors cursor-pointer"
                      title="Ver en mapa"
                    >
                      <MapIcon size={12} />
                    </button>
                  )}
                  {onCancelVuelo && (v.estado === 'PROGRAMADO' || v.estado === 'EN_RUTA') && (
                    <button
                      onClick={e => { e.stopPropagation(); onCancelVuelo(v.id, v.codigo_vuelo); }}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors cursor-pointer"
                      title="Cancelar vuelo"
                    >
                      <XCircle size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {vuelosFiltrados.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">
            Ningún vuelo coincide con los filtros
          </p>
        )}
      </div>

      <Modal
        open={!!maletasModal}
        onClose={handleCerrarMaletas}
        title={
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-emerald-600" />
            <span>
              Maletas del vuelo {maletasModal?.vueloCodigo ?? ''}
            </span>
          </div>
        }
      >
        {maletasLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
            <span className="w-3 h-3 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
            Cargando maletas...
          </div>
        )}

        {!maletasLoading && maletasError && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded">
            {maletasError}
          </div>
        )}

        {!maletasLoading && !maletasError && (
          <>
            <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
              <span>
                {maletas.length === 0
                  ? 'Este vuelo no tiene maletas asignadas todavía.'
                  : `${maletas.length} maleta${maletas.length !== 1 ? 's' : ''} en ${maletasPorEquipaje.length} equipaje${maletasPorEquipaje.length !== 1 ? 's' : ''}.`}
              </span>
              {maletas.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const all = maletas.map(m => m.codigo_maleta).join('\n');
                    navigator.clipboard?.writeText(all);
                  }}
                  title="Copiar todos los IDs al portapapeles"
                >
                  <Copy size={12} />
                  Copiar todos
                </Button>
              )}
            </div>

            {maletas.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {maletasPorEquipaje.map(([equipajeIdExt, lista]) => (
                  <div key={equipajeIdExt} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-semibold tracking-wide">
                          EQUIPAJE
                        </span>
                        <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {equipajeIdExt}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {lista.length} maleta{lista.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                      {lista.map((m) => (
                        <li key={m.id} className="flex items-center justify-between px-3 py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                              {m.codigo_maleta}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopiarMaleta(m.codigo_maleta)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                            title="Copiar ID al portapapeles"
                          >
                            {maletaCopiada === m.codigo_maleta ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
