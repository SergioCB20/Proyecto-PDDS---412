# Juego de datos — Simulación al Colapso Logístico

Este directorio contiene el juego de datos **exclusivo del escenario de colapso**
(data histórica + proyectada, ampliada hasta el **24-06-2030** y con mayor tasa de
llegada de paquetes en el tiempo).

> Se usa **solamente** para la simulación al colapso. El escenario de simulación de
> 5 días sigue leyendo de `../data/`.

## Cómo instalarlo

Copiar aquí los archivos con el mismo formato y convención de nombre que el dataset
de simulación:

```
_envios_SPIM_.txt
_envios_SABE_.txt
...
```

Formato de cada línea (7 campos separados por `-`):

```
id-aaaammdd-hh-mm-destino-cantidad-idCliente
000000001-20260102-00-53-LKPR-002-0012655
```

## Configuración

| Property | Env | Default |
|---|---|---|
| `app.colapso.ruta-archivos` | `RUTA_ENVIOS_COLAPSO` | `src/main/resources/data-colapso/` |
| `app.simulacion.fecha-base-archivo` | `SIMULACION_FECHA_BASE` | `2026-01-02` |

`fecha-base-archivo` es el **primer día de datos** y define el mínimo aceptado para
`fecha_inicio_virtual`. Si el juego de datos del colapso empieza en otra fecha, hay que
ajustarlo o las corridas se rechazarán con "fecha_inicio_virtual debe ser >= …".

## Carga por ventana

La carga admite acotar por rango de fechas (`cargarVentana`), de modo que solo se
ingesten los días que la corrida va a simular. El dataset completo son decenas de
millones de filas entre `equipajes` y `maletas`; una corrida de 5 días usa una
fracción mínima. Esto es lo que hace viable la **estrategia de aproximación sucesiva**
(varias corridas con distintas fechas de inicio para acorralar la fecha de colapso).
