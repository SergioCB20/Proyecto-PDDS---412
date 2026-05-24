## ADDED Requirements

### Requirement: Botón de descarga de manifiesto PDF

El sistema DEBE permitir al usuario con rol OPERADOR_LOGISTICO descargar el manifiesto PDF de un vuelo desde la pantalla de operación.

#### Scenario: Descarga exitosa de manifiesto
- **WHEN** el usuario hace clic en el botón "Descargar Manifiesto" de un vuelo programado
- **THEN** el sistema descarga un archivo PDF con nombre `manifiesto_{codigo_vuelo}_{fecha}.pdf`

#### Scenario: Vuelo no encontrado (404)
- **WHEN** el usuario hace clic en descargar manifiesto de un vuelo que ya no existe
- **THEN** el sistema muestra una alerta "Vuelo no encontrado"

#### Scenario: Vuelo sin equipajes (422)
- **WHEN** el usuario hace clic en descargar manifiesto de un vuelo sin equipajes registrados
- **THEN** el sistema muestra una alerta "El vuelo no tiene equipajes registrados"
