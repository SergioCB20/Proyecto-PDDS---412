## 1. Backend — Filtro `codigo_equipaje`

- [x] 1.1 Modificar `EquipajeRepository.java`: agregar parámetro `codigoEquipaje` a la query `findEnviosPanel` con `LIKE CONCAT('%', :codigoEquipaje, '%')`
- [x] 1.2 Modificar `EquipajeService.java`: agregar parámetro `String codigoEquipaje` a `obtenerEnviosPanel` y pasarlo al repository
- [x] 1.3 Modificar `EquipajeController.java`: agregar `@RequestParam(required = false) String codigo_equipaje` al endpoint `GET /api/equipajes/envios-panel`
- [x] 1.4 Modificar `SesionService.java`: agregar parámetro `String codigoEquipaje` a `obtenerEnviosPanelSesion` y pasarlo al repository
- [x] 1.5 Modificar `SesionController.java`: agregar `@RequestParam(required = false) String codigo_equipaje` al endpoint `GET /api/sesiones/{id}/envios/envios-panel`

## 2. Frontend — API layer

- [x] 2.1 Modificar `lib/api.ts`: agregar parámetro `codigoEquipaje?: string` a `fetchEnviosPanel` y pasarlo como query param `codigo_equipaje`
- [x] 2.2 Modificar `lib/api.ts`: agregar parámetro `codigoEquipaje?: string` a `fetchEnviosPanelSesion` y pasarlo como query param `codigo_equipaje`

## 3. Frontend — PanelEnviosMaletas (input de filtro + botones)

- [x] 3.1 Agregar props `onSeguirEnMapa` y `onMostrarRuta` al interface `PanelEnviosMaletasProps`
- [x] 3.2 Importar `Loader2`, `MapPin`, `Route` de `lucide-react`; `fetchPlanViaje` de `@/lib/api`; `SegmentoResponse` de `@/lib/types`
- [x] 3.3 Agregar estado `codigoEquipaje` con `useReducer` (mismo patrón que `origen`/`destino`)
- [x] 3.4 Agregar input de texto "Código maleta" junto a los selects origen/destino
- [x] 3.5 Pasar `codigoEquipaje || undefined` a las llamadas `fetchEnviosPanel` / `fetchEnviosPanelSesion`
- [x] 3.6 Agregar estados `siguiendoId` y `mostrandoRutaId` (useState)
- [x] 3.7 Agregar handler `handleSeguir` (mismo patrón que PanelEnviosOperacion)
- [x] 3.8 Agregar handler `handleMostrarRuta` (mismo patrón que PanelEnviosOperacion)
- [x] 3.9 Renderizar botones MapPin y Route por fila, solo cuando `tab === 'en_vuelo'` y los callbacks existan

## 4. Frontend — PanelTabs (prop passthrough)

- [x] 4.1 Agregar props `onSeguirEnMapa` y `onMostrarRuta` al interface `PanelTabsProps`
- [x] 4.2 Importar `SegmentoResponse` de `@/lib/types`
- [x] 4.3 Pasar ambas props a `<PanelEnviosMaletas>`

## 5. Frontend — page.tsx (cableado en las 3 vistas)

- [x] 5.1 En OperacionView: pasar `onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}` y `onMostrarRuta={handleMostrarRutaOp}` al `<PanelTabs>`
- [x] 5.2 En SimulacionView: pasar `onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}` y `onMostrarRuta={handleMostrarRutaSim}` al `<PanelTabs>`
- [x] 5.3 En ColapsoView: pasar `onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}` y `onMostrarRuta={handleMostrarRutaCol}` al `<PanelTabs>`
