# plan-viaje-pdf

> **Spec owner:** Frontend Dev / Backend Dev
> **Estado:** Draft v1
> **Última actualización:** 2026
> **Implementado por:** Backend Dev + Frontend Dev

---

## ADDED Requirements

### Requirement: Incluir UUID del equipaje en respuestas de listado de envíos

Tanto `EnvioItemOperacionResponse` (BC1, usado en operación) como `EnvioItemResponse` (BC2, usado en simulación) SHALL incluir el campo `id` de tipo UUID que identifica al equipaje.

#### Scenario: EnvioItemOperacionResponse incluye id

- **WHEN** el backend responde a `GET /vuelos/{vueloId}/equipajes` o `GET /nodos/{iata}/equipajes`
- **THEN** cada ítem SHALL incluir el campo `id` con el UUID del equipaje

#### Scenario: EnvioItemResponse incluye id

- **WHEN** el backend responde a `GET /sesiones/{sesionId}/envios/vuelo/{vueloId}` o `GET /sesiones/{sesionId}/envios/nodo/{iata}`
- **THEN** cada ítem SHALL incluir el campo `id` con el UUID del equipaje

---

### Requirement: Endpoint de descarga de plan de viaje PDF

El sistema SHALL exponer un endpoint `GET /api/equipajes/{id}/plan-viaje/descargar` que retorne un archivo PDF con el detalle completo del plan de viaje de un equipaje.

#### Scenario: Descarga exitosa de PDF

- **WHEN** se solicita `GET /api/equipajes/{id}/plan-viaje/descargar` con un UUID válido que tiene plan de viaje
- **THEN** la respuesta SHALL tener `Content-Type: application/pdf`
- **THEN** la respuesta SHALL tener `Content-Disposition: attachment; filename="plan-viaje-{codigo_equipaje}-{fecha}.pdf"`
- **THEN** el body SHALL ser un PDF válido

#### Scenario: Equipaje no encontrado

- **WHEN** se solicita con un UUID que no corresponde a ningún equipaje
- **THEN** la respuesta SHALL ser `404 Not Found`

#### Scenario: Equipaje sin plan de viaje

- **WHEN** se solicita con un UUID de equipaje que no tiene plan de viaje asignado (ej. estado REGISTRADO)
- **THEN** la respuesta SHALL ser `422 Unprocessable Entity`

---

### Requirement: Contenido del PDF

El PDF generado SHALL contener la siguiente información:

- Título: "PLAN DE VIAJE"
- Código del equipaje (id_externo)
- Cantidad de maletas
- Aeropuerto origen (código IATA)
- Aeropuerto destino (código IATA)
- Estado SLA (EN_TIEMPO / INCUMPLIMIENTO_SLA)
- Tiempo estimado de entrega
- Tabla de segmentos con columnas: Orden | Vuelo | Origen → Destino | Hora de salida programada
- Total de segmentos al pie de la tabla

#### Scenario: PDF generado con segmentos

- **WHEN** un equipaje tiene 3 segmentos en su plan de viaje
- **THEN** el PDF SHALL mostrar una tabla con 3 filas de segmentos ordenados por `orden` ascendente
- **THEN** cada fila SHALL mostrar el número de orden, código de vuelo, origen→destino, y hora de salida

#### Scenario: PDF sin segmentos

- **WHEN** el plan de viaje existe pero no tiene segmentos
- **THEN** el PDF SHALL mostrar la sección "Sin segmentos registrados"

---

### Requirement: Botón de descarga en panel de envíos

Los componentes `PanelEnviosOperacion` (operación) y `PanelEnvios` (simulación) SHALL mostrar un botón de descarga por cada equipaje listado, que permita descargar el plan de viaje en PDF.

#### Scenario: Botón visible en operación

- **WHEN** el usuario ve la lista de envíos de un vuelo o aeropuerto en el módulo de Operación
- **THEN** cada fila de equipaje SHALL mostrar un ícono de descarga
- **THEN** al hacer clic, SHALL descargarse el PDF del plan de viaje

#### Scenario: Botón visible en simulación

- **WHEN** el usuario ve la lista de envíos de un vuelo o aeropuerto en el módulo de Simulación
- **THEN** cada fila de equipaje SHALL mostrar un ícono de descarga
- **THEN** al hacer clic, SHALL descargarse el PDF del plan de viaje

#### Scenario: Error silencioso en descarga fallida

- **WHEN** la descarga del PDF falla (equipaje sin plan de viaje, error de red)
- **THEN** el sistema SHALL mostrar una alerta o mensaje de error breve
- **THEN** el resto de la interfaz SHALL permanecer operativa

---

### Requirement: Cliente HTTP para descarga

El frontend SHALL tener una función `descargarPlanViajePdf(equipajeId: string)` que llame al endpoint y maneje la descarga del blob.

#### Scenario: Descarga y apertura del PDF

- **WHEN** la función se ejecuta con un UUID válido
- **THEN** SHALL obtener el blob del PDF mediante `api.downloadBlob()`
- **THEN** SHALL crear una URL temporal y abrirla en una nueva pestaña
- **THEN** SHALL liberar la URL temporal después de 10 segundos
