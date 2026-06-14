## ADDED Requirements

### Requirement: Mostrar fecha/hora REAL de inicio
La vista de simulación SHALL mostrar la fecha y hora real de inicio de la sesión. El valor proviene del campo `fecha_inicio_real` del endpoint `GET /sesiones/{id}/metricas` (tarea B1). Si no está disponible (sesión no iniciada), SHALL mostrarse "—" o un valor calculado client-side.

#### Scenario: Fecha real de inicio disponible desde backend
- **WHEN** la sesión está `EN_CURSO` y `fecha_inicio_real` está presente en métricas
- **THEN** SHALL mostrar la fecha en formato `DD/MM/AAAA HH:mm:ss`

#### Scenario: Fecha real de inicio no disponible aún
- **WHEN** la sesión está `CONFIGURADA` y `fecha_inicio_real` es null
- **THEN** SHALL mostrar un placeholder ("—")

### Requirement: Mostrar fecha/hora REAL actual (se congela al finalizar)
La vista SHALL mostrar la fecha y hora real actual calculada como `fechaInicioReal + segundosRealesTranscurridos`. Cuando la sesión pase a estado `FINALIZADA`, el valor SHALL congelarse (no seguir incrementando).

#### Scenario: Fecha real actual durante ejecución
- **WHEN** la sesión está `EN_CURSO`
- **THEN** SHALL calcular y mostrar `fechaInicioReal + segundosRealesTranscurridos`
- **THEN** el valor SHALL actualizarse en cada tick de polling

#### Scenario: Fecha real actual congelada al finalizar
- **WHEN** la sesión pasa a `FINALIZADA`
- **THEN** el valor de fecha/hora real actual SHALL congelarse
- **THEN** NO SHALL seguir incrementándose aunque el polling continúe

### Requirement: Mostrar fecha/hora VIRTUAL de inicio
La vista SHALL leer `fecha_inicio_virtual` y `hora_inicio_virtual` de los `searchParams` de la URL y mostrarlos en formato legible.

#### Scenario: Fecha virtual de inicio visible desde URL
- **WHEN** la URL contiene `?fecha_inicio_virtual=2025-06-01&hora_inicio_virtual=08:00`
- **THEN** SHALL mostrar "Inicio virtual: 01/06/2025 08:00"

#### Scenario: Fecha virtual de inicio con valores por defecto
- **WHEN** la URL no contiene los parámetros de fecha virtual
- **THEN** SHALL mostrar valores por defecto basados en el estado inicial de la sesión

### Requirement: Mostrar fecha/hora VIRTUAL actual (se congela al finalizar)
La vista SHALL mostrar `dia_hora_virtual` de las métricas en vivo. Al llegar al estado `FINALIZADA`, el valor SHALL congelarse.

#### Scenario: Fecha virtual actual durante ejecución
- **WHEN** la sesión está `EN_CURSO` y hay datos de métricas
- **THEN** SHALL mostrar `dia_hora_virtual` con formato `DD/MM/AAAA HH:mm`

#### Scenario: Fecha virtual actual congelada al finalizar
- **WHEN** la sesión pasa a `FINALIZADA`
- **THEN** el último valor de `dia_hora_virtual` SHALL congelarse
- **THEN** NO SHALL mostrar un valor vacío o nulo aunque el polling devuelva datos incompletos
