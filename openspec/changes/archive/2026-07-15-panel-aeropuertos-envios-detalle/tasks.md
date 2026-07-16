## 1. Backend — Nuevas queries JPQL en EquipajeRepository

- [x] 1.1 Agregar query `findEnRutadoSaliendo`: busca equipajes ENRUTADO cuyo primer segmento PENDIENTE tiene nodoOrigen = nodoIata
- [x] 1.2 Agregar query `findEnVueloLlegando`: busca equipajes EN_VUELO cuyo vueloActual.destino.codigoIata = nodoIata
- [x] 1.3 Agregar query `findEnAlmacenEnNodo`: busca equipajes EN_ALMACEN cuyo último segmento COMPLETADO termina en nodoIata
- [x] 1.4 Agregar índice compuesto en `segmentos_plan` para (plan_viaje_id, orden, estado) si no existe

## 2. Backend — Nuevos DTOs y método en EquipajeService

- [x] 2.1 Crear record `EnvioNodoDetalleResponse` con campos: id, codigo_equipaje, origen_iata, destino_iata, cantidad, estado, codigo_vuelo, fecha_ingreso, maletas
- [x] 2.2 Crear record `ConteoNodo` con campos: saliendo_envios, saliendo_maletas, llegando_envios, llegando_maletas
- [x] 2.3 Crear record `NodoEnviosResponse` con campos: nodo_iata, saliendo (List), llegando (List), conteo
- [x] 2.4 Implementar método `obtenerEnviosPorNodoConClasificacion(String nodoIata)` que:
  - Consulta registrados + enrutados → saliendo (LinkedHashSet para dedup)
  - Consulta almacenados + en_vuelo → llegando (LinkedHashSet para dedup)
  - Calcula conteos
  - Mapea a respuestas incluyendo maletas (físicas o virtuales)

## 3. Backend — Nuevo endpoint en NodoController

- [x] 3.1 Agregar endpoint `GET /api/nodos/{iata}/envios` que retorna `NodoEnviosResponse`
- [x] 3.2 Agregar manejo de error 404 si el nodo no existe
- [x] 3.3 Compilar y verificar que el endpoint responde correctamente

## 4. Frontend — Tipos y API

- [x] 4.1 Agregar interfaces `EnvioNodoDetalle`, `ConteoNodo`, `NodoEnviosResponse` en `lib/types.ts`
- [x] 4.2 Agregar función `fetchEnviosNodoConClasificacion(iata: string)` en `lib/api.ts`

## 5. Frontend — Nuevo componente DetalleEnviosAeropuerto

- [x] 5.1 Crear `DetalleEnviosAeropuerto.tsx` en `components/operacion/`
- [x] 5.2 Implementar fetching de datos con estado loading/error/success
- [x] 5.3 Renderizar secciones "Saliendo" y "Llegando" con encabezados de conteo
- [x] 5.4 Renderizar lista de envíos con expandible para maletas individuales
- [x] 5.5 Agregar botones Seguir/Ruta/PDF por envío
- [x] 5.6 Manejar estados vacío y error

## 6. Frontend — Modificar PanelAeropuertosOperacion

- [x] 6.1 Agregar columnas "🡑 Sale" y "🡓 Llega" al table header
- [x] 6.2 Agregar celdas de conteo en cada fila (con valor "—" si no cargado)
- [x] 6.3 Agregar estado `aeropuertoSeleccionado` para controlar qué aeropuerto está expandido
- [x] 6.4 Modificar `onClick` de fila para toggle de selección
- [x] 6.5 Integrar `DetalleEnviosAeropuerto` debajo de la tabla cuando hay selección

## 7. Frontend — Ajustes en page.tsx

- [x] 7.1 Verificar que los nuevos props fluyen correctamente desde la vista de operación
- [x] 7.2 Asegurar que el modal `ModalEnvios` solo se abre para tipo `vuelo` (ya no para nodo)
