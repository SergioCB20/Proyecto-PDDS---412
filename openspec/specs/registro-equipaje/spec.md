# registro-equipaje

> **Spec owner:** Frontend Dev
> **Estado:** Implementado
> **Última actualización:** 2026-05-11

---

## Requirement: Formulario de registro de equipaje

El sistema DEBERÁ mostrar un formulario de registro de equipaje en la ruta `/operacion` con los siguientes campos: `id_equipaje` (texto), `destino_iata` (select), `vuelo_id` (select), `sla_comprometido` (numérico). El formulario DEBERÁ enviar los datos al endpoint `POST /api/equipajes` cuando el operador confirme el envío.

#### Scenario: Registro exitoso de equipaje
- **WHEN** el operador llena todos los campos y presiona "Registrar"
- **THEN** el sistema envía POST a `/api/equipajes` y muestra el plan de viaje generado con estado "ENRUTADO"

#### Scenario: Validación de campos obligatorios
- **WHEN** el operador intenta enviar sin llenar algún campo obligatorio
- **THEN** el sistema muestra mensaje de error en el campo faltante

#### Scenario: Error de capacidad del vuelo
- **WHEN** el operador envía el formulario pero el vuelo está lleno
- **THEN** el sistema muestra mensaje de error del API (422)

#### Scenario: Fallback a mock data cuando API no disponible
- **WHEN** la llamada a `/vuelos?estado=PROGRAMADO` falla
- **THEN** el sistema usa `MOCK_VUELOS` para poblar el select

## Requirement: Select de vuelos programados

El campo `vuelo_id` DEBERÁ poblarse dinámicamente con vuelos cuyo estado sea "PROGRAMADO", obtenidos de `GET /vuelos?estado=PROGRAMADO`. Cada opción DEBERÁ mostrar el código del vuelo, origen → destino y hora de salida.

#### Scenario: Vuelos programados disponibles
- **WHEN** el componente se monta
- **THEN** el sistema obtiene vuelos programados y los muestra en el select

#### Scenario: Sin vuelos programados disponibles
- **WHEN** no hay vuelos con estado PROGRAMADO
- **THEN** el sistema muestra mensaje "No hay vuelos programados disponibles"

## Requirement: Select de destinos IATA

El campo `destino_iata` DEBERÁ poblarse con los códigos IATA únicos de los nodos disponibles obtenidos de `GET /nodos`. Los nodos DEBERÁN mostrarse ordenados alfabéticamente por código IATA.

#### Scenario: Destinos disponibles
- **WHEN** el usuario abre el select de destinos
- **THEN** el sistema muestra la lista de códigos IATA disponibles

## Requirement: Manejo de respuesta del servidor

Tras un registro exitoso, el sistema DEBERÁ mostrar el plan de viaje generado incluyendo: ID del equipaje, estado, estado SLA, tiempo de entrega estimado, y la lista de segmentos del viaje.

#### Scenario: Respuesta exitosa muestra plan de viaje
- **WHEN** el servidor responde 201 con el plan de viaje
- **THEN** el sistema muestra los segmentos del plan: orden, código de vuelo, origen, destino, hora de salida