# Delta Spec: C4 - UI de Carga Masiva de Equipaje

## Resumen

Agregar funcionalidad de carga masiva de equipaje via CSV en la página de operación.

## Cambios

### frontend/app/operacion/page.tsx

**Nuevos imports:**
- `Upload, FileSpreadsheet, AlertTriangle` de `lucide-react`
- `Modal` de `@/components/ui/Modal`
- `CargaMasivaPreview, CargaMasivaFila` de `@/lib/types`

**Nuevos estados:**
- `cargaMasivaOpen: boolean` - controla visibilidad del modal
- `csvFile: File | null` - archivo seleccionado
- `csvPreview: CargaMasivaPreview | null` - resultado del parseo
- `csvLoading: boolean` - indicador de procesamiento
- `csvError: string | null` - mensaje de error
- `csvConfirmLoading: boolean` - indicador de confirmación

**Nuevas funciones:**
- `parseCSV(content: string): CargaMasivaPreview` - parsea CSV y valida datos
- `handleFileChange(e: React.ChangeEvent<HTMLInputElement>)` - maneja selección de archivo
- `handleConfirmarCargaMasiva()` - envía datos al backend
- `handleCargaMasivaClose()` - limpia estados al cerrar modal

**UI agregada:**
- Botón "Carga Masiva" junto al botón "Individual"
- Modal con:
  - Input de archivo CSV
  - Indicador de carga
  - Preview de válidos (tabla)
  - Preview de errores (tabla)
  - Botón de confirmar

### frontend/lib/types.ts

**Nuevos tipos:**
```typescript
interface CargaMasivaFila {
  id_equipaje: string;
  destino_iata: string;
  vuelo_id: string;
  sla_comprometido: string;
}

interface CargaMasivaPreview {
  validos: CargaMasivaFila[];
  con_revision: { fila: number; errores: string[] }[];
}
```

## Notas

- Validación contra nodos existentes (código IATA) y vuelos existentes (ID)
- El endpoint `/equipajes/carga-masiva/confirmar` debe ser implementado en backend
- Formato CSV esperado: `id_equipaje, destino_iata, vuelo_id, sla_horas`