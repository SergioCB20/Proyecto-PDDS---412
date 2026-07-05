## 1. API — Nueva función fetchPlanViaje

- [x] 1.1 Agregar import de `EquipajePlanViaje` en `frontend/lib/api.ts`
- [x] 1.2 Agregar función `fetchPlanViaje(equipajeId)` que llame `GET /equipajes/{id}/plan-viaje`

## 2. Panel Operación — PanelEnviosOperacion.tsx

- [x] 2.1 Agregar prop opcional `onSeguirEnMapa?: (vueloId: string) => void` a la interfaz del componente
- [x] 2.2 Importar `MapPin` de `lucide-react` y `fetchPlanViaje` de `@/lib/api`
- [x] 2.3 Agregar estado local `const [siguiendoId, setSiguiendoId] = useState<string | null>(null)`
- [x] 2.4 Agregar botón `MapPin` por fila, con tooltip "Seguir en mapa", condicional a `onSeguirEnMapa`
- [x] 2.5 Implementar `handleSeguir(id)` que: setea `siguiendoId`, llama `fetchPlanViaje`, extrae `ubicacion_actual`, llama `onSeguirEnMapa(referencia_id)` si es VUELO, muestra alert si es NODO, restaura `siguiendoId` al finalizar
- [x] 2.6 Mostrar spinner (animación rotación) en el botón cuando `siguiendoId === item.id`

## 3. Panel Simulación — PanelEnvios.tsx

- [x] 3.1 Agregar prop opcional `onSeguirEnMapa?: (vueloId: string) => void` a la interfaz del componente
- [x] 3.2 Importar `MapPin` de `lucide-react` y `fetchPlanViaje` de `@/lib/api`
- [x] 3.3 Agregar estado local `siguiendoId` (idéntico al paso 2.3)
- [x] 3.4 Agregar botón `MapPin` por fila (idéntico al paso 2.4)
- [x] 3.5 Implementar `handleSeguir(id)` (idéntico al paso 2.5)
- [x] 3.6 Mostrar spinner en el botón (idéntico al paso 2.6)

## 4. Cableado en page.tsx — Tres vistas

- [x] 4.1 En `OperacionView`: pasar `onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}` a `<PanelEnviosOperacion>`
- [x] 4.2 En `SimulacionView`: pasar la misma prop a `<PanelEnvios>`
- [x] 4.3 En `ColapsoView`: pasar la misma prop a `<PanelEnvios>`
