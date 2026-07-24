"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, RotateCcw, CheckCircle, AlertCircle, Settings, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TZ_AERO, tzAbrev } from "@/lib/timezone";

interface PrepEstado {
  capacidades?: Record<string, number>;
  planes_tag_count?: number;
  equipajes_tag_count?: number;
  tag?: string;
}

export default function AdminPrepPage() {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [horaPresentacion, setHoraPresentacion] = useState("11");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<PrepEstado | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchEstado() {
    try {
      const res = await fetch("/back/api/operacion/preparacion/estado", {
        headers: { "X-Device-Id": "admin" }
      });
      if (res.ok) setEstado(await res.json());
    } catch {
      /* ignore */
    }
  }

  useState(() => {
    fetchEstado();
  });

  async function handlePreparar() {
    if (!archivo) {
      setError("Selecciona el archivo de planes");
      return;
    }
    setError(null);
    setResultado(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("hora_presentacion", horaPresentacion);
      const res = await fetch("/back/api/operacion/preparacion", {
        method: "POST",
        body: fd,
        headers: { "X-Device-Id": "admin" }
      });
      const json = await res.json();
      if (res.ok) {
        setResultado(json);
        fetchEstado();
      } else {
        setError(json.error || "Error al preparar");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestaurar() {
    if (!confirm("¿Restaurar capacidades originales y eliminar planes/envios de la prueba?")) return;
    setError(null);
    setResultado(null);
    setLoading(true);
    try {
      const res = await fetch("/back/api/operacion/preparacion/restaurar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Device-Id": "admin" }
      });
      const json = await res.json();
      if (res.ok) {
        setResultado(json);
        fetchEstado();
      } else {
        setError(json.error || "Error al restaurar");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const capsOriginales: Record<string, number> = { SPIM: 440, SABE: 460, EKCH: 480, VIDP: 480 };
  const capsEsperadas: Record<string, number> = { SPIM: 999, SABE: 999, EKCH: 999, VIDP: 999 };

  const capsActuales = estado?.capacidades || {};
  const enPrep = ["SPIM", "SABE", "EKCH", "VIDP"].every(k => capsActuales[k] === 999);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => router.push("/")}
        className="fixed top-3 left-3 z-50 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        <ArrowLeft size={13} />
        Volver al mapa
      </button>
      <div className="flex items-center gap-3 mb-6">
        <Settings size={24} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Admin · Preparación día-a-día
        </h1>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Configura el escenario antes de la prueba. Las capacidades vuelven a su valor original
        al restaurar (limpieza al final). Los planes y equipajes se marcan con{' '}
        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">tag_dia_a_dia</code>{' '}
        para limpieza selectiva sin tocar datos de simulación.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card title="1. Cargar archivo de planes">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Formato: <code>ORIG-DEST-HO:MO-HD:MD-####</code> (líneas con {'**'} son comentarios).
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
            HO = hora del archivo base (12). Ajustar HD = HO + duración + Δhusos según sede y hora presentación.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv"
            onChange={e => setArchivo(e.target.files?.[0] || null)}
            className="hidden"
          />

          <div
            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={28} className="mx-auto text-slate-500 mb-2" />
            {archivo ? (
              <p className="text-sm font-medium text-blue-600">{archivo.name}</p>
            ) : (
              <p className="text-sm text-slate-600">Click para seleccionar archivo</p>
            )}
          </div>

          <div className="mt-3">
            <Input
              label="Hora presentación (hora local de Lima)"
              type="number"
              min={0}
              max={23}
              value={horaPresentacion}
              onChange={e => setHoraPresentacion(e.target.value)}
            />
          </div>

          <Button
            className="w-full mt-3"
            onClick={handlePreparar}
            disabled={loading || !archivo}
          >
            <Upload size={16} className="mr-2" />
            {loading ? "Procesando..." : "Activar modo día-a-día"}
          </Button>
        </Card>

        <Card title="2. Estado actual">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Capacidades</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TZ_AERO).map(([iata, tz]) => {
                  const cap = capsActuales[iata];
                  const esperado = enPrep ? 999 : capsOriginales[iata];
                  const ok = cap === esperado;
                  return (
                    <div
                      key={iata}
                      className={`p-2 rounded border ${
                        ok
                          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                          : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                      }`}
                    >
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {iata} · {tzAbrev(iata)}
                      </div>
                      <div className="text-sm font-mono">
                        {cap ?? '?'} / {esperado}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Planes tag_prueba:</span>
              <span className="font-mono">{estado?.planes_tag_count ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Envios tag_prueba:</span>
              <span className="font-mono">{estado?.equipajes_tag_count ?? 0}</span>
            </div>

            {enPrep ? (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs">
                <AlertCircle size={14} className="text-amber-600" />
                <span>Modo prueba activo. Ejecutar limpieza al terminar.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <CheckCircle size={14} className="text-slate-500" />
                <span>Estado normal (capacidades originales).</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title="3. Resultado">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 mb-3">
            <AlertCircle size={16} className="text-red-600" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {resultado && (
          <div className="space-y-2 text-sm">
            {Object.entries(resultado).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">{k}:</span>
                <span className="font-mono">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="danger"
            onClick={handleRestaurar}
            disabled={loading}
            className="w-full"
          >
            <RotateCcw size={16} className="mr-2" />
            {loading ? "Restaurando..." : "Restaurar estado (cleanup al final)"}
          </Button>
        </div>
      </Card>

      <Card title="Horario de pruebas sugerido" className="mt-4">
        <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
          <li>• 0:00 - Iniciar modo día-a-día (este panel)</li>
          <li>• 0:01 - Cada estudiante fija TZ de su computador + abre /recepcion</li>
          <li>• 0:02 - Wizard 1-click para elegir sede (SPIM/SABE/EKCH/VIDP)</li>
          <li>• 0:03 - 1 min de espera silenciosa</li>
          <li>• 0:04 - Inicio del registro individual (5-10 envíos cada uno)</li>
          <li>• 0:14 - Carga masiva de archivo (10-15 min)</li>
          <li>• 0:30 - Selección de envíos y mostrar rutas en el mapa</li>
          <li>• 0:35 - Cancelar vuelo + ver reasignación</li>
          <li>• 0:40 - Restaurar estado (este panel)</li>
        </ul>
      </Card>
    </div>
  );
}
