## 1. Tipos base y constantes

- [x] 1.1 Renombrar tipos en `lib/types.ts`: `Nodo` → `Aeropuerto`, `NodoEnMapa` → `AeropuertoEnMapa`, `NodoTelemetria` → `AeropuertoTelemetria`. Las propiedades que mapean a JSON keys del backend (`nodo_ref_id`, `nodo_origen`, `nodo_destino`, `nodo_colapso_ref_id`) conservan sus nombres originales.
- [x] 1.2 Renombrar constantes en `lib/colors.ts`: `COLOR_NODO` → `COLOR_AEROPUERTO`, `colorNodoPorOcupacion` → `colorAeropuertoPorOcupacion`
- [x] 1.3 Renombrar mocks y mappers en `lib/mock.ts`: `MOCK_NODOS` → `MOCK_AEROPUERTOS`, `nodoToEnMapa` → `aeropuertoToEnMapa`
- [x] 1.4 Renombrar funciones de storage en `lib/device.ts`: `getNodoRefId` → `getAeropuertoRefId`, `setNodoRefId` → `setAeropuertoRefId`
- [x] 1.5 Renombrar funciones de API en `lib/api.ts`: `fetchEnviosNodo` → `fetchEnviosAeropuerto`, `fetchEnviosNodoOperacion` → `fetchEnviosAeropuertoOperacion`

## 2. Componentes renombrados

- [x] 2.1 Renombrar `components/mapa/GeoMapaNodo.tsx` → `GeoMapaAeropuerto.tsx`: tipo `NodoEnMapa` → `AeropuertoEnMapa`, prop `nodo` → `aeropuerto`
- [x] 2.2 Renombrar `components/operacion/PanelNodosOperacion.tsx` → `PanelAeropuertosOperacion.tsx`: tipo `NodoTelemetria` → `AeropuertoTelemetria`, props `nodos` → `aeropuertos`, `onNodoClick` → `onAeropuertoClick`, variables internas renombradas
- [x] 2.3 Renombrar `components/simulacion/PanelNodos.tsx` → `PanelAeropuertos.tsx`: mismos cambios que PanelAeropuertosOperacion

## 3. Textos UI

- [x] 3.1 Actualizar textos en `components/operacion/PanelAeropuertosOperacion.tsx`: headers "Nodos" → "Aeropuertos", textos vacío/filtro
- [x] 3.2 Actualizar textos en `components/simulacion/PanelAeropuertos.tsx`: headers "Nodos" → "Aeropuertos", textos vacío/filtro
- [x] 3.3 Actualizar textos en `components/operacion/PanelEnviosOperacion.tsx`: "Envíos en nodo" → "Envíos en aeropuerto"
- [x] 3.4 Actualizar textos en `components/simulacion/PanelEnvios.tsx`: "Envíos en nodo" → "Envíos en aeropuerto"
- [x] 3.5 Actualizar texto en `components/mapa/GeoMapaLeyenda.tsx`: "Ocupacion Nodos" → "Ocupación Aeropuertos"

## 4. Componentes importadores

- [x] 4.1 Actualizar imports y props en `components/mapa/GeoMapa.tsx`: import `AeropuertoEnMapa`, dynamic `GeoMapaAeropuerto`, prop `aeropuertos`
- [x] 4.2 Actualizar imports en `components/mapa/GeoMapaVuelo.tsx`: `COLOR_NODO` → `COLOR_AEROPUERTO`
- [x] 4.3 Actualizar imports y variable en `components/operacion/ResumenVuelosOperacion.tsx`: `porNodo` → `porAeropuerto`

## 5. Página principal

- [x] 5.1 Actualizar imports en `app/page.tsx`: todos los tipos, funciones y componentes renombrados
- [x] 5.2 Renombrar variables de estado y props en `OperacionView`: `nodos` → `aeropuertos`, `nodo` → `aeropuerto`, etc.
- [x] 5.3 Renombrar variables de estado y props en `SimulacionView`: `initialNodos` → `initialAeropuertos`, `nodosMapa` → `aeropuertosMapa`, etc.

## 6. Verificación

- [x] 6.1 Build del frontend (`npm run build`) sin errores de TypeScript (solo pre-existing admin page error)
- [x] 6.2 Deploy al servidor y verificar que ambos módulos funcionan
