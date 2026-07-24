"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package, Building2, Clock, FileSpreadsheet, Upload, CheckCircle, XCircle,
  LogOut, RefreshCw, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { device } from "@/lib/device";
import { TZ_AERO, tzAbrev, formatLocal } from "@/lib/timezone";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface NodoLite {
  id: string;
  codigo_iata: string;
  nombre: string;
}

interface EnvioReciente {
  id: string;
  id_externo: string;
  destino_iata: string;
  cantidad: number;
  estado: string;
  fecha_ingreso: string;
  fecha_ingreso_local: string;
}

const SEDES: NodoLite[] = [
  { id: "spim", codigo_iata: "SPIM", nombre: "Lima (Perú)" },
  { id: "sabe", codigo_iata: "SABE", nombre: "Buenos Aires (Argentina)" },
  { id: "ekch", codigo_iata: "EKCH", nombre: "Copenhague (Dinamarca)" },
  { id: "vidp", codigo_iata: "VIDP", nombre: "Delhi (India)" },
];

export default function RecepcionPage() {
  const router = useRouter();
  const [nodo, setNodo] = useState<NodoLite | null>(null);
  const [destinos, setDestinos] = useState<NodoLite[]>([]);
  const [destinoIata, setDestinoIata] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ ingresados?: number; fallidos?: number } | null>(null);

  const [envios, setEnvios] = useState<EnvioReciente[]>([]);
  const [enviosLoading, setEnviosLoading] = useState(false);

  const [hora, setHora] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const storedId = device.getAeropuertoRefId();
    if (storedId) {
      const found = SEDES.find(s => s.id === storedId);
      if (found) setNodo(found);
    }
  }, []);

  useEffect(() => {
    api.get<NodoLite[]>("/nodos")
      .then(list => setDestinos(list.filter(d => d.codigo_iata !== nodo?.codigo_iata).sort((a, b) => a.codigo_iata.localeCompare(b.codigo_iata))))
      .catch(() => {});
  }, [nodo]);

  const cargarEnvios = useCallback(async () => {
    if (!nodo) return;
    setEnviosLoading(true);
    try {
      const res = await api.get<EnvioReciente[]>(`/nodos/${nodo.codigo_iata}/equipajes`);
      setEnvios(res.slice(0, 50));
    } catch {
      /* ignore */
    } finally {
      setEnviosLoading(false);
    }
  }, [nodo]);

  useEffect(() => {
    cargarEnvios();
    const id = setInterval(cargarEnvios, 5000);
    return () => clearInterval(id);
  }, [cargarEnvios]);

  function elegirSede(nodoId: string) {
    const found = SEDES.find(s => s.id === nodoId);
    if (found) {
      device.setAeropuertoRefId(found.id);
      setNodo(found);
    }
  }

  function cambiarSede() {
    device.setAeropuertoRefId("");
    setNodo(null);
    setDestinoIata("");
    setSuccess(null);
    setError(null);
    setCsvFile(null);
    setCsvResult(null);
    setEnvios([]);
  }

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault();
    if (!nodo || !destinoIata) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<{ id_externo: string }>(
        "/equipajes",
        { destino_iata: destinoIata, cantidad },
        { "X-Device-Nodo-Id": await getDeviceNodoId() }
      );
      setSuccess(`Registrado: ${res.id_externo}`);
      setDestinoIata("");
      setCantidad(1);
      cargarEnvios();
    } catch (err) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || "Error al registrar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCargaMasiva() {
    if (!csvFile || !nodo) return;
    setCsvLoading(true);
    setCsvResult(null);
    setError(null);
    try {
      const nodoId = await getDeviceNodoId();
      const fd = new FormData();
      fd.append("archivo", csvFile);
      const preview = await api.upload<{ validos: number; total: number }>(
        "/equipajes/carga-masiva",
        fd,
        { "X-Device-Nodo-Id": nodoId }
      );
      if (preview.validos === 0) {
        setError("Ninguna fila válida en el archivo");
        return;
      }
      const confirm = await api.post<{ ingresados: number; fallidos: number }>(
        "/equipajes/carga-masiva/confirmar",
        {},
        { "X-Device-Nodo-Id": nodoId }
      );
      setCsvResult(confirm);
      cargarEnvios();
      setCsvFile(null);
    } catch (err) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || "Error en carga");
    } finally {
      setCsvLoading(false);
    }
  }

  // Necesitamos el ID del nodo (UUID), no solo IATA, para X-Device-Nodo-Id header.
  async function getDeviceNodoId(): Promise<string> {
    if (!nodo) throw new Error("Sin sede");
    const list = await api.get<{ id: string; codigo_iata: string }[]>("/nodos");
    const found = list.find(n => n.codigo_iata === nodo.codigo_iata);
    if (!found) throw new Error("Nodo no encontrado");
    return found.id;
  }

  if (!nodo) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <button
          onClick={() => router.push("/")}
          className="fixed top-3 left-3 z-50 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <ArrowLeft size={13} />
          Volver al mapa
        </button>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Building2 size={48} className="mx-auto text-blue-600 mb-3" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Recepción de Equipaje
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              ¿En qué aeropuerto se encuentra esta computadora?
            </p>
            <p className="text-xs text-slate-500 mt-2">
              (1-click por sede. No hay login: depende del dispositivo)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SEDES.map(s => (
              <button
                key={s.id}
                onClick={() => elegirSede(s.id)}
                className="p-5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <div className="text-2xl font-bold text-blue-600 font-mono">{s.codigo_iata}</div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-1">
                  {s.nombre}
                </div>
                <div className="text-xs text-slate-500 mt-1">{tzAbrev(s.codigo_iata)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <button
        onClick={() => router.push("/")}
        className="fixed top-3 left-3 z-50 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        <ArrowLeft size={13} />
        Volver al mapa
      </button>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 font-mono font-bold rounded">
              {nodo.codigo_iata}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {nodo.nombre}
              </div>
              <div className="text-xs text-slate-500">{tzAbrev(nodo.codigo_iata)}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={11} />
                <span>HORA LOCAL</span>
              </div>
              <div className="text-base font-mono font-bold text-slate-700 dark:text-slate-200">
                {formatLocal(nodo.codigo_iata, hora)}
              </div>
            </div>

            <button
              onClick={cambiarSede}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 px-3 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              title="Cambiar de sede"
            >
              <LogOut size={13} />
              Cambiar sede
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Registro individual</h2>
            <span className="ml-auto text-xs text-slate-500">5-10 envíos por estudiante</span>
          </div>

          <form onSubmit={handleRegistrar} className="grid grid-cols-3 gap-3">
            <Select
              label="Destino"
              value={destinoIata}
              onChange={e => setDestinoIata(e.target.value)}
              options={destinos.map(d => ({ value: d.codigo_iata, label: `${d.codigo_iata} — ${d.nombre}` }))}
              disabled={submitting || destinos.length === 0}
            />
            <Input
              label="Cantidad"
              type="number"
              min={1}
              value={cantidad}
              onChange={e => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={submitting || !destinoIata}>
                {submitting && <Loader2 size={14} className="animate-spin mr-2" />}
                Registrar envío
              </Button>
            </div>
          </form>

          {success && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm">
              <CheckCircle size={14} className="text-green-600" />
              <span className="text-green-700 dark:text-green-300">{success}</span>
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm">
              <XCircle size={14} className="text-red-600" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet size={18} className="text-green-600" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Carga masiva (archivo del curso)</h2>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Formato: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
              id_envío-aaaammdd-hh-mm-dest-###-IdClien
            </code>
          </p>

          <div className="flex items-center gap-3">
            <input
              id="csv-file"
              type="file"
              accept=".txt,.csv"
              onChange={e => setCsvFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <Button onClick={handleCargaMasiva} disabled={csvLoading || !csvFile}>
              {csvLoading && <Loader2 size={14} className="animate-spin mr-2" />}
              <Upload size={14} className="mr-2" />
              Cargar
            </Button>
          </div>

          {csvResult && (
            <div className="mt-3 p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
              <CheckCircle size={14} className="inline text-blue-600 mr-2" />
              <span className="text-blue-700 dark:text-blue-300">
                Ingresados: {csvResult.ingresados ?? 0} / Fallidos: {csvResult.fallidos ?? 0}
              </span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Envíos recientes</h2>
            <button
              onClick={cargarEnvios}
              className="ml-auto p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              disabled={enviosLoading}
            >
              <RefreshCw size={14} className={`text-slate-500 ${enviosLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {envios.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Sin envíos todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left py-2 font-medium">Código</th>
                    <th className="text-left py-2 font-medium">Destino</th>
                    <th className="text-right py-2 font-medium">Cant.</th>
                    <th className="text-left py-2 font-medium">Hora local</th>
                    <th className="text-left py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {envios.map(e => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 font-mono text-xs">{e.id_externo || e.id.slice(0, 8)}</td>
                      <td className="py-2 font-mono text-xs">{e.destino_iata}</td>
                      <td className="py-2 text-right font-mono">{e.cantidad}</td>
                      <td className="py-2 text-xs text-slate-600">
                        {e.fecha_ingreso_local || (e.fecha_ingreso ? new Date(e.fecha_ingreso).toLocaleTimeString() : '-')}
                      </td>
                      <td className="py-2 text-xs">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 rounded">
                          {e.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
