"use client";

import { useState } from "react";
import {
  Package, ChevronDown, ChevronUp, XCircle,
  CheckCircle, FileText, FileSpreadsheet,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Aeropuerto, CrearEquipajeResponse } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface RegistroEquipajePanelProps {
  aeropuertos: Aeropuerto[];
  sesionId?: string;
}

export function RegistroEquipajePanel({
  aeropuertos,
  sesionId,
}: RegistroEquipajePanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    origenIata: "",
    destinoIata: "",
    cantidad: 1,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<CrearEquipajeResponse | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const destinoOptions = aeropuertos
    .filter((n) => n.codigo_iata)
    .map((n) => ({ value: n.codigo_iata, label: n.codigo_iata }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);
    try {
      const aeropuertoAux = aeropuertos.find(
        (n) => n.codigo_iata === formData.origenIata,
      );
      if (!aeropuertoAux) {
        setFormError("Seleccione un aeropuerto origen");
        setFormLoading(false);
        return;
      }
      const response = await api.post<CrearEquipajeResponse>(
        "/equipajes",
        {
          destino_iata: formData.destinoIata,
          cantidad: formData.cantidad,
        },
        { "X-Device-Nodo-Id": aeropuertoAux.id },
      );
      setFormSuccess(response);
      setFormData({ origenIata: "", destinoIata: "", cantidad: 1 });
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setFormError(
        error.mensaje || error.message || "Error al registrar equipaje",
      );
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="flex-1 flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Package size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
              Individual
            </span>
          </div>
          {formOpen ? (
            <ChevronUp size={16} className="text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronDown size={16} className="text-blue-600 dark:text-blue-400" />
          )}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
        >
          <Select
            label="Aeropuerto Origen"
            placeholder={
              aeropuertos.length === 0
                ? "No hay aeropuertos"
                : "Seleccionar aeropuerto origen"
            }
            options={destinoOptions}
            value={formData.origenIata}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, origenIata: e.target.value }))
            }
            disabled={aeropuertos.length === 0}
          />
          <Select
            label="Destino IATA"
            placeholder={
              aeropuertos.length === 0
                ? "No hay destinos"
                : "Seleccionar destino"
            }
            options={destinoOptions}
            value={formData.destinoIata}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, destinoIata: e.target.value }))
            }
            disabled={aeropuertos.length === 0}
          />
          <Input
            label="Número de Maletas"
            type="number"
            min="1"
            value={formData.cantidad}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                cantidad: Math.max(1, parseInt(e.target.value) || 1),
              }))
            }
          />
          {formError && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
              <XCircle
                size={14}
                className="text-red-600 dark:text-red-400"
              />
              <span className="text-xs text-red-700 dark:text-red-300">
                {formError}
              </span>
            </div>
          )}
          <Button
            type="submit"
            disabled={formLoading}
            className="w-full"
          >
            {formLoading ? "Registrando..." : "Registrar"}
          </Button>
        </form>
      )}

      {formSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle
              size={16}
              className="text-green-600 dark:text-green-400"
            />
            <span className="font-medium text-sm text-green-900 dark:text-green-100">
              Equipaje registrado
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">
                Código:
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {formSuccess.id_externo ||
                  formSuccess.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-300">
                Estado:
              </span>
              <Badge variant="green">
                <FileText size={11} className="mr-1" />
                {formSuccess.estado}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
