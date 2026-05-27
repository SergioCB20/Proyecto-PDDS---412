'use client';

import { useEffect, useState } from 'react';
import { Package, Clock, MapPin, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle, Plane, ArrowRight, Upload, FileSpreadsheet, AlertTriangle, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { MOCK_NODOS, MOCK_VUELOS, nodoToEnMapa } from '@/lib/mock';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import type { Nodo, Vuelo, NodoEnMapa, CrearEquipajeRequest, CrearEquipajeResponse, CargaMasivaPreview, CargaMasivaConfirmResponse } from '@/lib/types';

const GeoMapa = dynamic(() => import('@/components/mapa/GeoMapa'), { ssr: false });

interface EquipajeReciente {
  id_externo: string;
  destino: string;
  estado: string;
  tiempo: string;
}

export default function OperacionPage() {
  const [nodos, setNodos] = useState<NodoEnMapa[]>(MOCK_NODOS.map(nodoToEnMapa));
  const [vuelosProgramados, setVuelosProgramados] = useState<Vuelo[]>([]);
  const [allVuelos, setAllVuelos] = useState<Vuelo[]>(MOCK_VUELOS);
  const [equipajesRecientes, setEquipajesRecientes] = useState<EquipajeReciente[]>([
    { id_externo: 'MAL-2025-001', destino: 'MIA', estado: 'EN_VUELO', tiempo: 'hace 2 min' },
    { id_externo: 'MAL-2025-002', destino: 'BOG', estado: 'ENRUTADO', tiempo: 'hace 5 min' },
    { id_externo: 'MAL-2025-003', destino: 'GRU', estado: 'EN_VUELO', tiempo: 'hace 8 min' },
    { id_externo: 'MAL-2025-004', destino: 'SCL', estado: 'REGISTRADO', tiempo: 'hace 12 min' },
    { id_externo: 'MAL-2025-005', destino: 'MIA', estado: 'EN_ALMACEN', tiempo: 'hace 15 min' },
    { id_externo: 'MAL-2025-006', destino: 'LIM', estado: 'ENTREGADO', tiempo: 'hace 20 min' },
    { id_externo: 'MAL-2025-007', destino: 'BOG', estado: 'EN_VUELO', tiempo: 'hace 25 min' },
    { id_externo: 'MAL-2025-008', destino: 'GRU', estado: 'EN_REPLANIFICACION', tiempo: 'hace 30 min' },
  ]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [formOpen, setFormOpen] = useState(true);
  const [formData, setFormData] = useState({
    idEquipaje: '',
    destinoIata: '',
    vueloId: '',
    slaComprometido: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<CrearEquipajeResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [cargaMasivaOpen, setCargaMasivaOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CargaMasivaPreview | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvConfirmLoading, setCsvConfirmLoading] = useState(false);
  const [manifestLoading, setManifestLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nodosData, vuelosData] = await Promise.all([
        api.get<Nodo[]>('/nodos').catch(() => MOCK_NODOS),
        api.get<{ content: Vuelo[] }>('/vuelos?size=50').catch(() => ({ content: MOCK_VUELOS })),
      ]);
      setNodos(Array.isArray(nodosData) ? nodosData.map(nodoToEnMapa) : MOCK_NODOS.map(nodoToEnMapa));
      const vuelosArray = 'content' in vuelosData ? vuelosData.content : (Array.isArray(vuelosData) ? vuelosData : MOCK_VUELOS);
      setAllVuelos(vuelosArray);
      setVuelosProgramados(vuelosArray.filter((v: Vuelo) => v.estado === 'PROGRAMADO'));
      setLastUpdate(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    const timer = setTimeout(fetchData, 0);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const estadoColor = (estado: string): 'green' | 'yellow' | 'red' | 'blue' | 'default' => {
    if (estado === 'ENTREGADO') return 'green';
    if (estado === 'EN_VUELO' || estado === 'EN_ALMACEN') return 'blue';
    if (estado === 'EN_REPLANIFICACION') return 'yellow';
    if (estado === 'INCUMPLIMIENTO_SLA') return 'red';
    return 'default';
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.idEquipaje.trim()) errors.idEquipaje = 'ID de equipaje es requerido';
    if (!formData.destinoIata) errors.destinoIata = 'Destino es requerido';
    if (!formData.vueloId) errors.vueloId = 'Vuelo es requerido';
    if (!formData.slaComprometido.trim()) errors.slaComprometido = 'SLA es requerido';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const slaDatetime = new Date();
      slaDatetime.setHours(slaDatetime.getHours() + parseInt(formData.slaComprometido));

      const request: CrearEquipajeRequest = {
        id_equipaje: formData.idEquipaje,
        destino_iata: formData.destinoIata,
        vuelo_id: formData.vueloId,
        sla_comprometido: slaDatetime.toISOString(),
      };

      const response = await api.post<CrearEquipajeResponse>('/equipajes', request);
      setFormSuccess(response);
      setFormData({ idEquipaje: '', destinoIata: '', vueloId: '', slaComprometido: '' });
      setEquipajesRecientes(prev => [
        { id_externo: formData.idEquipaje, destino: formData.destinoIata, estado: response.estado, tiempo: 'ahora' },
        ...prev.slice(0, 7),
      ]);
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setFormError(error.mensaje || error.message || 'Error al registrar equipaje');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvError(null);
    setCsvLoading(true);

    try {
      const formData = new FormData();
      formData.append('archivo', file);
      const preview = await api.upload<CargaMasivaPreview>('/equipajes/carga-masiva', formData);
      setCsvPreview(preview);
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setCsvError(error.mensaje || error.message || 'Error al procesar archivo');
      setCsvPreview(null);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleConfirmarCargaMasiva = async () => {
    if (!csvPreview) return;
    const registrosValidos = csvPreview.registros.filter(r => r.estado_validacion === 'VALIDO');
    if (registrosValidos.length === 0) return;

    setCsvConfirmLoading(true);
    setCsvError(null);
    try {
      const ids_equipaje = registrosValidos.map(r => r.id_equipaje);
      const response = await api.post<CargaMasivaConfirmResponse>('/equipajes/carga-masiva/confirmar', { ids_equipaje });
      setCargaMasivaOpen(false);
      setCsvFile(null);
      setCsvPreview(null);
      fetchData();
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setCsvError(error.mensaje || error.message || 'Error al confirmar carga');
    } finally {
      setCsvConfirmLoading(false);
    }
  };

  const handleCargaMasivaClose = () => {
    setCargaMasivaOpen(false);
    setCsvFile(null);
    setCsvPreview(null);
    setCsvError(null);
  };

  const handleDescargarManifiesto = async (vuelo: Vuelo) => {
    setManifestLoading(vuelo.id);
    try {
      const blob = await api.downloadBlob(`/manifiestos/${vuelo.id}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manifiesto_${vuelo.codigo_vuelo}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const error = err as { status?: number; mensaje?: string };
      if (error.status === 404) {
        alert('Vuelo no encontrado');
      } else if (error.status === 422) {
        alert('El vuelo no tiene equipajes registrados');
      } else {
        alert(error.mensaje || 'Error al descargar manifiesto');
      }
    } finally {
      setManifestLoading(null);
    }
  };

  const destinoOptions = nodos.filter(n => n.codigo_iata).map(n => ({ value: n.codigo_iata, label: n.codigo_iata })).sort((a, b) => a.label.localeCompare(b.label));

  const vueloOptions = vuelosProgramados.map(v => ({
    value: v.id,
    label: `${v.codigo_vuelo} (${v.origen.codigo_iata} → ${v.destino.codigo_iata}) ${new Date(v.hora_salida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
  }));

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-1 p-4">
        <GeoMapa
          nodos={nodos}
          vuelos={allVuelos}
          mostrarAviones={true}
          animacionActiva={false}
          className="h-full"
        />
      </div>

      <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Operacion en Vivo</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ultima actualizacion: {lastUpdate ? lastUpdate.toLocaleTimeString('es-ES') : '...'}
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setFormOpen(!formOpen)}
              className="flex-1 flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-sm text-blue-900 dark:text-blue-100">Individual</span>
              </div>
              {formOpen ? <ChevronUp size={16} className="text-blue-600 dark:text-blue-400" /> : <ChevronDown size={16} className="text-blue-600 dark:text-blue-400" />}
            </button>
            <button
              onClick={() => setCargaMasivaOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <FileSpreadsheet size={16} className="text-green-600 dark:text-green-400" />
              <span className="font-medium text-sm text-green-900 dark:text-green-100">Carga Masiva</span>
            </button>
          </div>

          {formOpen && (
            <form onSubmit={handleSubmit} className="space-y-3 mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <Input
                label="ID Equipaje"
                placeholder="MAL-2025-00123"
                value={formData.idEquipaje}
                onChange={e => setFormData(prev => ({ ...prev, idEquipaje: e.target.value }))}
                error={formErrors.idEquipaje}
                autoComplete="off"
              />

              <Select
                label="Destino IATA"
                placeholder="Seleccionar destino"
                options={destinoOptions}
                value={formData.destinoIata}
                onChange={e => setFormData(prev => ({ ...prev, destinoIata: e.target.value }))}
                error={formErrors.destinoIata}
              />

              <Select
                label="Vuelo"
                placeholder={vuelosProgramados.length === 0 ? 'No hay vuelos programados' : 'Seleccionar vuelo'}
                options={vueloOptions}
                value={formData.vueloId}
                onChange={e => setFormData(prev => ({ ...prev, vueloId: e.target.value }))}
                error={formErrors.vueloId}
                disabled={vuelosProgramados.length === 0}
              />

              <Input
                label="SLA Comprometido (horas)"
                type="number"
                placeholder="24"
                min="1"
                value={formData.slaComprometido}
                onChange={e => setFormData(prev => ({ ...prev, slaComprometido: e.target.value }))}
                error={formErrors.slaComprometido}
              />

              {formError && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                  <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-700 dark:text-red-300">{formError}</span>
                </div>
              )}

              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? 'Registrando...' : 'Registrar'}
              </Button>
            </form>
          )}

          {formSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                <span className="font-medium text-sm text-green-900 dark:text-green-100">Equipaje registrado</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">ID:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{formSuccess.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Estado:</span>
                  <Badge variant="green">{formSuccess.estado}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">SLA:</span>
                  <Badge variant={formSuccess.plan_viaje.estado_sla === 'EN_TIEMPO' ? 'green' : 'red'}>
                    {formSuccess.plan_viaje.estado_sla.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                  <span className="text-slate-600 dark:text-slate-400 block mb-1">Plan de viaje:</span>
                  {formSuccess.plan_viaje.segmentos.map((seg, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                      <Plane size={12} />
                      <span>{seg.nodo_origen}</span>
                      <ArrowRight size={10} />
                      <span>{seg.nodo_destino}</span>
                      <span className="text-slate-400">({seg.vuelo_codigo})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3 mt-4">
            <Package size={16} className="text-slate-400" />
            <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">
              Equipajes Recientes
            </h3>
            <Badge variant="blue">{equipajesRecientes.length}</Badge>
          </div>

          <div className="space-y-2">
            {equipajesRecientes.map((eq, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700">
                  <Package size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {eq.id_externo}
                    </span>
                    <Badge variant={estadoColor(eq.estado)}>{eq.estado.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MapPin size={11} className="text-slate-400" />
                    <span className="text-xs text-slate-500">{eq.destino}</span>
                    <Clock size={11} className="text-slate-400 ml-2" />
                    <span className="text-xs text-slate-400">{eq.tiempo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {vuelosProgramados.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3 mt-4">
                <Plane size={16} className="text-slate-400" />
                <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">
                  Vuelos Programados
                </h3>
                <Badge variant="blue">{vuelosProgramados.length}</Badge>
              </div>
              <div className="space-y-2">
                {vuelosProgramados.slice(0, 20).map((vuelo) => (
                  <div
                    key={vuelo.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700">
                      <Plane size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {vuelo.codigo_vuelo}
                      </div>
                      <div className="text-xs text-slate-500">
                        {vuelo.origen.codigo_iata} → {vuelo.destino.codigo_iata}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDescargarManifiesto(vuelo)}
                      disabled={manifestLoading === vuelo.id}
                      className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 disabled:opacity-50"
                      title="Descargar Manifiesto PDF"
                    >
                      <Download size={16} className={manifestLoading === vuelo.id ? 'animate-pulse' : ''} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-3">
              Resumen de Nodos
            </h3>
            <div className="space-y-2">
              {nodos.map((nodo) => (
                <div key={nodo.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {nodo.codigo_iata}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {nodo.ocupacion_actual}/{nodo.capacidad_almacen}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: nodo.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            Polling cada 5s — preparado para Redis
          </p>
        </div>
      </div>

      <Modal
        open={cargaMasivaOpen}
        onClose={handleCargaMasivaClose}
        title="Carga Masiva de Equipaje"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCargaMasivaClose}>Cancelar</Button>
            <Button 
              onClick={handleConfirmarCargaMasiva} 
              disabled={!csvPreview || csvPreview.validos === 0 || csvConfirmLoading}
            >
              {csvConfirmLoading ? 'Confirmando...' : `Confirmar (${csvPreview?.validos || 0})`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {csvFile ? csvFile.name : 'Subir archivo CSV'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formato: id_equipaje, destino_iata, vuelo_id, sla_comprometido
              </p>
            </label>
          </div>

          {csvLoading && (
            <div className="text-center text-sm text-slate-500">Procesando archivo...</div>
          )}

          {csvError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{csvError}</span>
            </div>
          )}

          {csvPreview && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-slate-600 dark:text-slate-400">Total: {csvPreview.total}</span>
                <div className="flex items-center gap-1">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-green-700 dark:text-green-400">Válidos: {csvPreview.validos}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle size={14} className="text-yellow-500" />
                  <span className="text-yellow-700 dark:text-yellow-400">Con revisión: {csvPreview.con_revision}</span>
                </div>
              </div>

              {(() => {
                const registrosValidos = csvPreview.registros.filter(r => r.estado_validacion === 'VALIDO');
                const registrosRevision = csvPreview.registros.filter(r => r.estado_validacion === 'REVISION');
                return (
                  <>
                    {registrosValidos.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">ID</th>
                              <th className="p-2 text-left">Destino</th>
                              <th className="p-2 text-left">Vuelo</th>
                              <th className="p-2 text-left">SLA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrosValidos.slice(0, 10).map((row, i) => (
                              <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                                <td className="p-2">{row.id_equipaje}</td>
                                <td className="p-2">{row.destino_iata}</td>
                                <td className="p-2">{row.vuelo_id}</td>
                                <td className="p-2">{new Date(row.sla_comprometido).toLocaleString('es-ES')}</td>
                              </tr>
                            ))}
                            {registrosValidos.length > 10 && (
                              <tr className="border-t border-slate-200 dark:border-slate-700">
                                <td colSpan={4} className="p-2 text-center text-slate-500">
                                  ...y {registrosValidos.length - 10} más
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {registrosRevision.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-yellow-50 dark:bg-yellow-900/30 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Fila</th>
                              <th className="p-2 text-left">ID</th>
                              <th className="p-2 text-left">Motivo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrosRevision.map((row, i) => (
                              <tr key={i} className="border-t border-yellow-200 dark:border-yellow-800">
                                <td className="p-2">{row.fila}</td>
                                <td className="p-2">{row.id_equipaje}</td>
                                <td className="p-2 text-red-600 dark:text-red-400">{row.motivo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}