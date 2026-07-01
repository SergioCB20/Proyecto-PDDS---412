
# LECCIONES APRENDIDAS — TAS FB2B

**Proyecto:** Sistema de Gestión Logística de Equipaje
**Curso:** 1INF54 — Proyecto de Desarrollo de Software
**Fecha:** Julio 2026

---

## INSTRUCCIONES — PARÁMETROS PARA GENERAR LECCIONES APRENDIDAS

### Estructura obligatoria por estudiante

Cada estudiante debe registrar **4 lecciones aprendidas** en el siguiente orden:

| # | Categoría | Tipo |
|---|---|---|
| 1 | Gestión del Proyecto | Positiva |
| 2 | Gestión del Proyecto | Negativa |
| 3 | Desarrollo del Producto | Positiva |
| 4 | Desarrollo del Producto | Negativa |

### Componentes de cada lección

- **Descripción corta:** Título de la lección, no exceder **15 palabras**.
- **Descripción en detalle:** Explicación completa, no exceder **150 palabras**.

### Temas cubiertos

| Categoría | Alcance |
|---|---|
| **Gestión del Proyecto** | Planificación, riesgos, ejecución, control, reuniones, equipo de trabajo, comunicación, roles, metodología, herramientas de gestión. |
| **Desarrollo del Producto** | Análisis, diseño, desarrollo de algoritmos, desarrollo de componentes, integración, pruebas, tecnologías, arquitectura, base de datos, despliegue. |

### Criterios de calidad

Las lecciones aprendidas deben ser:

- **Aplicables:** que tengan impacto real o potencial en las operaciones o procesos.
- **Válidas:** basadas en hechos verdaderos del proyecto.
- **Significativas:** que identifiquen procesos o decisiones que reducen fallas o refuerzan resultados positivos.

### Reglas para generar nuevas propuestas

Si se requiere generar una nueva lección aprendida para un estudiante, se debe proporcionar al asistente:

1. **Nombre del estudiante** y breve descripción de su rol en el proyecto.
2. **Categoría y tipo** deseado (ej. "Desarrollo del Producto — Negativa").
3. **Contexto o área específica** en la que trabajó (ej. "frontend con Leaflet", "algoritmo ACO", "migraciones Flyway", "simulación 5D", etc.).
4. **Opcional:** un hecho concreto o problema real que haya ocurrido, para basar la lección en evidencia.

El asistente generará la lección respetando la estructura y límites de palabras indicados arriba.

---

## 1. EDUARDO CALDERON SIPAN

---

### Lección Aprendida — Gestión del Proyecto — Positiva

**Descripción corta:** Seguimiento ordenado de tareas mediante Issues y ramas por feature.

**Descripción en detalle:** Durante el desarrollo del backend (bc1), se asignaron tareas específicas a través de issues en GitHub, cada una con su propia rama y Pull Request. Esto permitió que los cambios de Eduardo en la gestión de equipajes, vuelos y nodos se integraran de forma ordenada sin conflictos con el trabajo de Sergio en bc2 y el frontend de Josue. El uso de ramas como `fix-simulacion-concurrencia` y `backend-envios-simulacion` facilitó el code review y el seguimiento del progreso. La lección es que la disciplina de ramas por feature con PRs, aunque toma tiempo al inicio, reduce drásticamente los conflictos de integración y permite que varios desarrolladores trabajen en paralelo de forma segura.

---

### Lección Aprendida — Gestión del Proyecto — Negativa

**Descripción corta:** Subestimación del esfuerzo de pruebas de integración entre componentes del backend.

**Descripción en detalle:** El equipo priorizó la implementación de funcionalidades sobre las pruebas de integración, confiando en pruebas unitarias aisladas. Esto provocó que errores como `LazyInitializationException` entre entidades JPA con relaciones LAZY, y problemas de concurrencia entre el `TickService` y el `SimulacionPlanificador`, solo se detectaran en etapas avanzadas del proyecto, requiriendo parches correctivos urgentes. Eduardo participó en la corrección de varios de estos bugs. Para futuros proyectos, se deberían planificar pruebas de integración desde el sprint 1, especialmente para las interacciones entre servicios que comparten estado (sesiones, vuelos, equipajes).

---

### Lección Aprendida — Desarrollo del Producto — Positiva

**Descripción corta:** Correcta implementación del patrón DDD con bounded contexts desacoplados.

**Descripción en detalle:** La arquitectura del backend se organizó en tres bounded contexts (bc1: gestión operativa, bc2: planificación, bc3: identidad), cada uno con sus propios servicios, repositorios y entidades. Eduardo trabajó principalmente en bc1, implementando la lógica de registro de equipaje, gestión de vuelos y nodos logísticos. La comunicación entre contextos se realizó mediante eventos de dominio (`ApplicationEventPublisher`), lo que evitó el acoplamiento directo. Esta separación permitió que cada contexto evolucionara de forma independiente y que los errores en un contexto no afectaran a los demás. La lección es que DDD con bounded contexts, aunque requiere más disciplina de diseño, es altamente efectivo para proyectos con múltiples módulos de negocio.

---

### Lección Aprendida — Desarrollo del Producto — Negativa

**Descripción corta:** Falta de índice FK en equipajes causó degradación crítica del rendimiento.

**Descripción en detalle:** Durante las pruebas de simulación con miles de equipajes, la operación de detener una sesión de simulación tardaba varios minutos en completarse. Se descubrió que la tabla `equipajes` no tenía un índice sobre `plan_viaje_id`, lo que obligaba a PostgreSQL a realizar un sequential scan de aproximadamente 7.7 millones de filas cada vez que se consultaban los equipajes asociados a un plan de viaje. La solución fue agregar el índice parcial `idx_equipajes_plan_viaje` mediante la migración Flyway V38. La lección es que el modelado de base de datos debe considerar desde el inicio los índices foráneos para las consultas más frecuentes, especialmente cuando se proyectan volúmenes grandes de datos.

---

## 2. SERGIO CHUMBIMUNI BUSTAMANTE

---

### Lección Aprendida — Gestión del Proyecto — Positiva

**Descripción corta:** Liderazgo técnico efectivo con documentación de especificaciones previa a la implementación.

**Descripción en detalle:** Sergio actuó como líder técnico del proyecto, estableciendo la práctica de redactar especificaciones detalladas en `openspec/specs/` antes de comenzar cualquier implementación. Documentos como `bc2-planificacion-replanificacion.md` y `api-contracts.md` sirvieron como fuente de verdad compartida para todo el equipo. Este enfoque "specs-first" permitió detectar inconsistencias en el diseño antes de escribir código, alineó a los 7 integrantes del equipo, y facilitó la revisión de los PRs. Además, Sergio gestionó la integración de todos los cambios mediante merges a `main`, manteniendo un historial limpio de 419+ commits. La lección es que un líder técnico que prioriza la documentación y la revisión de código establece una base sólida para la calidad del proyecto.

---

### Lección Aprendida — Gestión del Proyecto — Negativa

**Descripción corta:** Ausencia de un pipeline de CI/CD para detección temprana de errores.

**Descripción en detalle:** A pesar de contar con Docker Compose para el entorno local y más de 40 migraciones Flyway, el proyecto nunca implementó un pipeline de integración continua (GitHub Actions, Jenkins u otro). Esto significó que cada integración se validaba manualmente, y errores como los 500 recurrentes en los endpoints de simulación, el `IllegalStateException` no manejado, y la falta de manejo de `NullPointerException` en los mappers solo se descubrían al ejecutar el backend completo. Sergio, como líder, reconoció que la configuración de CI debió ser una prioridad del sprint 1 en lugar de una tarea postergada. Para proyectos futuros, un pipeline básico con compilación, pruebas y linting automatizado es indispensable.

---

### Lección Aprendida — Desarrollo del Producto — Positiva

**Descripción corta:** Algoritmo ACO adaptado exitosamente para enrutamiento batch de equipaje.

**Descripción en detalle:** Sergio implementó el `ACORoutingStrategy`, un algoritmo de colonia de hormigas adaptado para el ruteo batch de equipaje. El algoritmo construye un grafo en memoria a partir de los vuelos disponibles, maneja evaporación de feromonas (rho=0.2), depósito diferencial, tauMin/tauMax para evitar estancamiento, elitismo (factor elite sobre depósito normal) y verificación de alcanzabilidad BFS antes de seleccionar vuelos. La penalización SLA es gradual (proporcional a horas de retraso), no binaria. El motor de enrutamiento (`MotorEnrutamiento`) usa el patrón Strategy para alternar entre Greedy (individual) y ACO (batch) en tiempo de ejecución. Esta implementación fue clave para manejar volúmenes de hasta 16,000+ equipajes por día.

---

### Lección Aprendida — Desarrollo del Producto — Negativa

**Descripción corta:** Concurrencia no planificada entre TickService y Planificador causó estados inconsistentes.

**Descripción en detalle:** El motor de simulación ejecuta dos procesos concurrentes: el `TickService` (cada 5 segundos reales) y el `SimulacionPlanificador` (cada `sa_segundos` virtuales), ambos mutando los mismos `segmentos_plan`, `vuelos` y `nodos` de una sesión. Inicialmente no existía sincronización, lo que producía `StaleObjectStateException` y estados inconsistentes: un hilo eliminaba un segmento mientras el otro lo marcaba como `EN_CURSO`. Sergio diseñó `SesionLockManager` con `ReentrantLock` por sesión para garantizar exclusión mutua, permitiendo que diferentes sesiones corrieran en paralelo. Sin embargo, esta solución debió preverse desde el diseño arquitectónico inicial. La lección es que cualquier sistema con múltiples schedulers requiere un plan de concurrencia explícito desde el primer día.

---

## 3. JOSUE MORENO GALVEZ

---

### Lección Aprendida — Gestión del Proyecto — Positiva

**Descripción corta:** Comunicación efectiva con el backend para definir contratos de API.

**Descripción en detalle:** Josue, como desarrollador frontend, estableció una comunicación constante con los desarrolladores backend (Sergio y Eduardo) para definir los contratos de API antes de comenzar la implementación de las vistas. Documentos como `api-contracts.md` y reuniones rápidas permitieron acordar formatos de respuesta, códigos de error, y estructuras de datos. Esto fue especialmente crítico para la integración del mapa Leaflet con los datos de nodos y vuelos, y para las métricas en tiempo real vía WebSocket. Josue también implementó hooks personalizados (`useMetricas`, `useWebSocket`) que encapsularon la lógica de comunicación, facilitando el mantenimiento. La lección es que la definición temprana de contratos API reduce significativamente el retrabajo en la integración frontend-backend.

---

### Lección Aprendida — Gestión del Proyecto — Negativa

**Descripción corta:** Falta de pruebas en el frontend dificultó la detección de errores visuales.

**Descripción en detalle:** El frontend de Next.js se desarrolló sin ningún framework de pruebas (no se configuraron Jest, Cypress ni Playwright). Esto provocó que errores visuales como la animación de vuelos que no funcionaba (prop `animacionActiva` definida pero no usada en el componente), el mapa vacío cuando el WebSocket fallaba (sin datos REST de respaldo), y los colores incorrectos de los nodos (el backend enviaba `"VERDE"/"AMBAR"/"ROJO"` pero Leaflet esperaba colores hex) solo se detectaran durante las demostraciones o al integrar con el backend real. Josue tuvo que implementar parches correctivos para cada uno de estos problemas. Para el próximo proyecto, se debe configurar al menos un conjunto de pruebas de componentes con Storybook o Testing Library desde el inicio.

---

### Lección Aprendida — Desarrollo del Producto — Positiva

**Descripción corta:** Arquitectura de comunicación multitercer nivel: WebSocket, SSE y polling.

**Descripción en detalle:** Josue implementó una arquitectura de comunicación en tiempo real con tres capas: WebSocket como canal principal (`TelemetriaWebSocket` para actualizaciones de nodos y vuelos cada ~5s), Server-Sent Events como canal secundario (`GET /eventos/planificacion` con heartbeat cada 30s y ?token= para autenticación), y polling REST como respaldo (`useMetricas` cada 3s). Esta estrategia de "progressive enhancement" aseguró que el mapa operativo y las métricas de simulación funcionaran incluso si el WebSocket fallaba. Además, Josue implementó animaciones de aviones en el mapa con opacidad condicional (0.4 en pausa, 1.0 activo). La lección es que una arquitectura de comunicación robusta con múltiples capas de respaldo es esencial para aplicaciones de monitoreo en tiempo real.

---

### Lección Aprendida — Desarrollo del Producto — Negativa

**Descripción corta:** Dependencia exclusiva de WebSocket para datos iniciales del mapa.

**Descripción en detalle:** Inicialmente, el mapa operativo de Leaflet cargaba los nodos y vuelos únicamente a través de la conexión WebSocket. Si el WebSocket fallaba al inicio (por ejemplo, si el backend aún no estaba listo o Redis estaba caído), el mapa se mostraba completamente vacío sin ningún mensaje de error para el usuario. Josue corrigió esto añadiendo una carga inicial mediante peticiones REST (`GET /nodos` y `GET /vuelos?size=50`) al montar el componente, sirviendo como datos de placeholder hasta que el WebSocket se conectara. La lección es que las interfaces de usuario deben diseñarse considerando siempre los estados de carga, error y vacío, y no asumir que el canal de comunicación principal estará disponible al 100%.

---

## 4. ALVARO VARGAS

---

### Lección Aprendida — Gestión del Proyecto — Positiva

**Descripción corta:** Colaboración efectiva en la corrección de bugs críticos de simulación.

**Descripción en detalle:** Alvaro trabajó estrechamente con Sergio en la identificación y corrección de múltiples errores en el motor de simulación. Cuando surgieron los errores 500 en los endpoints de simulación (Redis no disponible, `Specification.anyOf()` sin argumentos, `NullPointerException` en mappers), Alvaro y Sergio coordinaron para aplicar try-catch en llamadas a Redis, usar `Specification.where(null)` y agregar null-safety en los mappers. Esta colaboración permitió resolver una ola de errores en poco tiempo. Adicionalmente, Alvaro contribuyó en la implementación del `GlobalExceptionHandler` para manejar `DataAccessException`, `DateTimeException` y `NullPointerException` de forma centralizada. La lección es que tener un equipo pequeño con comunicación directa permite responder rápidamente ante crisis técnicas.

---

### Lección Aprendida — Gestión del Proyecto — Negativa

**Descripción corta:** Redis como dependencia dura sin plan de degradación inicial.

**Descripción en detalle:** Inicialmente, el sistema de caché Redis fue implementado como una dependencia obligatoria: si Redis no estaba disponible, toda la funcionalidad de métricas y simulación fallaba con errores 500. Esto se descubrió en etapas avanzadas del proyecto cuando, durante pruebas en diferentes entornos, Redis no siempre estaba configurado. Alvaro participó en la corrección, agregando try-catch en todas las llamadas a Redis con degradación gradual (lectura directa de PostgreSQL como respaldo). La lección es que cualquier servicio externo (Redis, colas, APIs de terceros) debe diseñarse desde el inicio como una dependencia soft, con degradación controlada y no como un componente crítico del cual todo depende.

---

### Lección Aprendida — Desarrollo del Producto — Positiva

**Descripción corta:** Manejo centralizado de excepciones con GlobalExceptionHandler mejoró la robustez.

**Descripción en detalle:** Alvaro contribuyó a la implementación del `GlobalExceptionHandler` con la anotación `@RestControllerAdvice`, que captura y maneja de forma centralizada las excepciones no controladas en los controladores REST. Se registraron manejadores específicos para `DataAccessException` (errores de base de datos), `DateTimeException` (errores de fechas en simulación), `NullPointerException` (errores de lógica), `IllegalStateException` (estados inconsistentes) y `LazyInitializationException` (relaciones JPA perezosas). Esto permitió que, en lugar de devolver errores 500 genéricos, la API respondiera con mensajes descriptivos y códigos HTTP apropiados. La lección es que un manejo global de excepciones debe ser parte de la configuración inicial del proyecto, no una adición tardía.

---

### Lección Aprendida — Desarrollo del Producto — Negativa

**Descripción corta:** Desalineación de fechas virtuales con datos reales en la simulación.

**Descripción en detalle:** Durante la implementación del sistema de tiempo virtual para la simulación de 5 días, se descubrió un bug crítico: la `fecha_inicio_virtual` de la sesión no coincidía con las fechas reales de los archivos de datos de equipaje (cuya fecha base era 2026-01-02). Esto provocaba que los vuelos programados no se alinearan correctamente con los equipajes registrados, generando rutas inconsistentes. La solución implicó calcular un offset de días entre el inicio virtual de la sesión y la fecha base de los datos, y luego ejecutar una actualización JDBC para desplazar todas las `fecha_operacion` de los segmentos de plan. Alvaro trabajó en esta corrección junto con Sergio. La lección es que los sistemas de simulación con tiempo virtual requieren una estrategia clara de alineación de fechas desde el diseño.

---

*Documento generado para el curso 1INF54 — Proyecto de Desarrollo de Software*
