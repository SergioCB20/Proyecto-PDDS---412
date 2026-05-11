## Context

La página `/operacion` actualmente muestra un mapa interactivo y lista de equipajes recientes. Se necesita añadir un formulario de registro de equipaje que permita a operadores logísticos registrar equipajes individuales de forma sencilla.

La página está dividida en dos paneles: mapa (izquierda) y sidebar (derecha). El formulario se integrará en la parte superior del sidebar como una sección colapsable o fija.

## Goals / Non-Goals

**Goals:**
- Formulario funcional con los 4 campos requeridos
- Carga dinámica de vuelos programados desde API
- Select de destinos basado en los nodos disponibles
- Envío a `POST /api/equipajes` con manejo de respuesta
- Feedback visual de éxito/error

**Non-Goals:**
- No implementar carga masiva (es tarea C4)
- No modificar la lógica del mapa
- No agregar autenticación adicional (ya existe)

## Decisions

1. **Ubicación del formulario**: Sección colapsable en la parte superior del sidebar derecho, antes de "Equipajes Recientes". Alternativa: modal flotante — descartado por interferir con la experiencia del mapa.

2. **Carga de vuelos**: `GET /vuelos?estado=PROGRAMADO` se llama al montar el componente y se cachea en estado. Alternativa: cargar solo cuando el usuario abre el select — rechazado por simplicidad (el volumen es bajo).

3. **Select de destinos**: Se extraen los códigos IATA únicos de los nodos disponibles (`/nodos`). Alternativa: hardcodear lista — rechazado por no escalar.

4. **Feedback de respuesta**: Toast notification o mensaje inline debajo del formulario mostrando plan de viaje. Se usa mensaje inline para mantener contexto visible.

## Risks / Trade-offs

- [Riesgo] API no disponible → Mitigación: usar mock data con `MOCK_VUELOS` como fallback
- [Riesgo] Select de vuelos muy largo → Mitigación: filtrar solo PROGRAMADO, paginar si >50 items
- [Trade-off] Formulario en sidebar reduce espacio para lista de equipajes recientes → Aceptable: la lista puede scrollear