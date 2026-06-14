## 1. Backend

- [ ] 1.1 Agregar `continente` y `zona_horaria` al JSON de nodos en `TelemetriaService.java`

## 2. Frontend — Types

- [ ] 2.1 Agregar `continente` y `zona_horaria` a la interfaz `NodoTelemetria` en `types.ts`

## 3. Frontend — Componente PanelNodos

- [ ] 3.1 Crear `frontend/components/simulacion/PanelNodos.tsx` con props `nodos` y `vuelos`
- [ ] 3.2 Implementar filtros: input para código, select dinámico para continente
- [ ] 3.3 Implementar useMemo de opciones de continente únicas desde datos
- [ ] 3.4 Implementar useMemo de nodos filtrados
- [ ] 3.5 Implementar opciones de ordenamiento y useMemo de nodos ordenados
- [ ] 3.6 Derivar timing de vuelos (min hora_salida por origen, min hora_llegada por destino)
- [ ] 3.7 Renderizar: título, contador, filtros, select de orden, botón limpiar, lista

## 4. Frontend — Integración

- [ ] 4.1 Importar `PanelNodos` en `page.tsx`
- [ ] 4.2 Reemplazar inline "Resumen de Nodos" por `<PanelNodos>`

## 5. Verificación

- [ ] 5.1 Compilar backend (`mvn clean compile`)
- [ ] 5.2 Verificar TypeScript frontend (`npx tsc --noEmit`)
