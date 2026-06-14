## ADDED Requirements

### Requirement: Rutas de vuelo con líneas curvas (bezier)
Las rutas de vuelo en el mapa SHALL usar curvas bezier o arco en lugar de líneas rectas (`Polyline`). La curva SHALL ser calculada mediante interpolación cuadrática bezier con un punto de control desplazado perpendicularmente al punto medio del segmento.

#### Scenario: Ruta de vuelo muestra curva bezier
- **WHEN** un vuelo tiene estado `EN_RUTA` y coordenadas de origen y destino válidas
- **THEN** la ruta SHALL ser renderizada como una curva bezier entre origen y destino
- **THEN** la curva SHALL desviarse del punto medio con un offset perpendicular proporcional a la distancia

#### Scenario: Curva bezier con 50 puntos de interpolación
- **WHEN** se renderiza una curva bezier
- **THEN** SHALL generar al menos 50 puntos interpolados para una curva suave
- **THEN** el estilo (color, opacidad) SHALL coincidir con el estado del vuelo

#### Scenario: Offset perpendicular se ajusta a la distancia
- **WHEN** la distancia entre origen y destino es mayor
- **THEN** el offset perpendicular SHALL ser proporcionalmente mayor (más arco pronunciado)
- **WHEN** la distancia es menor
- **THEN** el offset SHALL ser menor (curva más sutil)
