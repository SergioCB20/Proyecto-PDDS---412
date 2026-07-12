# Tiempos de escala y recogida — análisis y aproximaciones

Notas sobre dos parámetros de tiempo del dominio del enrutamiento de maletas, su estado
actual en el código y cómo aproximar su implementación.

## Parámetros pedidos

| Parámetro | Valor | Descripción |
|---|---|---|
| **Escala mínima de la maleta** | **10 min** | Tiempo mínimo entre que la maleta llega a un aeropuerto intermedio y sale en el siguiente vuelo (conexión). Es un parámetro. |
| **Espera de recogida en destino final** | **15 min** | Tiempo que la maleta permanece en el almacén del aeropuerto destino final hasta que el cliente la recoge. Es un parámetro. |

## Estado actual en el código (antes de implementar)

### Escala mínima
- **Greedy** (`GreedyRoutingStrategy`): constante `MIN_CONEXION_MINUTOS = 60` → exige **60 min**
  entre `hora_llegada` del primer vuelo y `hora_salida` del segundo. Hardcodeado, no parámetro,
  y con valor distinto (60 ≠ 10).
- **ACO** (`ACORoutingStrategy`): el motor razona en **horas enteras** (`hora_salida.getHour()`,
  `duracionHoras = Duration.toHours()`). La espera de conexión se exige `esperaV >= 1` hora y tras
  aterrizar se avanza `horaActual = horaLlegada + 1`. Es decir, **~1 hora mínima** de escala y la
  granularidad **no permite representar 10 minutos**.

### Recogida en destino final
- **No modelado.** En `TickService.procesarVuelosLlegada`, cuando el segmento es el último, la
  maleta pasa a `ENTREGADO` en el **instante de `hora_llegada`**. No hay ventana de 15 min: la
  maleta no ocupa el almacén destino esos 15 min y el deadline de SLA se compara contra la hora
  de llegada, no contra `llegada + 15 min`.

## Aproximaciones para implementar

### 1. Escala mínima = 10 min (parámetro)
- **Modelo de datos:** añadir `escala_min_minutos` (default 10) a `sesiones_ejecucion` (junto a
  `k`, `sa_segundos`, umbrales) y propagarlo a las estrategias de ruteo.
- **Greedy:** reemplazar la constante `MIN_CONEXION_MINUTOS` por el parámetro. Cambio trivial: el
  filtro ya usa minutos (`Duration.between(...).toMinutes() >= X`).
- **ACO (el punto delicado):** hoy trabaja en horas enteras, por lo que 10 min es irrepresentable.
  Dos aproximaciones:
  - **(A) Exacta:** pasar el motor a **minutos** (usar `hora_salida`/`hora_llegada` completos o
    minutos-del-día en vez de `.getHour()`, y `duracion` en minutos). Es la correcta pero implica
    reescribir la construcción del grafo, `construirRuta`, `esAlcanzable` y `evaluarRuta`. Costo
    medio-alto y hay que revalidar rendimiento (el motor corre por lote cada `sa_segundos`).
  - **(B) Aproximada / rápida:** mantener el motor en horas para la búsqueda, pero validar la
    escala real de 10 min con los `OffsetDateTime` verdaderos (`hora_salida_dt`/`hora_llegada_dt`,
    que ya están en `ArcoVueloInterno`) al aceptar una conexión. Es decir, la heurística sigue en
    horas pero la **restricción dura** de 10 min se chequea con los timestamps reales. Menos
    invasivo; puede rechazar alguna conexión que la heurística consideró válida.
- **Recomendación:** empezar por Greedy (parámetro) + ACO opción (B); dejar (A) para cuando se
  quiera precisión de minutos de verdad en la heurística.

### 2. Recogida en destino final = 15 min (parámetro)
- **Modelo de datos:** añadir `recogida_min_minutos` (default 15) a la sesión.
- **Entrega / SLA:** el "entregado a tiempo" pasa a ser `hora_llegada_final + 15 min <= sla_comprometido`.
  Es decir, sumar 15 min al `tiempo_entrega_est` del plan y al chequeo de incumplimiento de SLA
  (`TickService.detectarIncumplimientoSla` / `enrutarVentana`, comparando contra `sla + 15 min`).
- **Ocupación de almacén:** al aterrizar el último vuelo, en vez de marcar `ENTREGADO` inmediato,
  la maleta ocupa el almacén destino durante 15 min (virtuales) y pasa a `ENTREGADO` cuando el reloj
  virtual supera `hora_llegada + 15 min`. Aproximación simple: registrar `entregable_en =
  hora_llegada + 15 min` y en cada tick mover a `ENTREGADO` las que ya lo superaron (y liberar la
  ocupación del nodo destino en ese momento).
  - Aproximación aún más simple (si no se quiere estado intermedio): mantener `ENTREGADO` al
    aterrizar pero **sumar los 15 min solo al deadline** (afecta SLA, no la ocupación). Menos fiel
    pero mucho más barata.

## Resumen

- Escala: hoy **60 min (Greedy) / ~1 h (ACO)**, hardcodeado → debe ser **10 min parametrizable**;
  ACO requiere granularidad de minutos (exacta) o validación con timestamps reales (aproximada).
- Recogida: **no existe** → **15 min parametrizable**, sumados al deadline efectivo y (opcional)
  como ventana de ocupación del almacén destino antes de `ENTREGADO`.
- Ninguno está como parámetro; ambos deberían añadirse a `sesiones_ejecucion` y exponerse en la
  configuración de la simulación.
