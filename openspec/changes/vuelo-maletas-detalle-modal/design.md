## Context

El modal `ModalEnvios` se abre al hacer clic en un vuelo o aeropuerto. Para vuelos, actualmente muestra los equipajes del vuelo como cards expandibles: cada equipaje carga sus maletas individuales de forma lazy (`fetchMaletasEquipaje`) al hacer clic. No existe una vista plana de todas las maletas del vuelo.

Ya existe el endpoint `GET /api/vuelos/{id}/maletas` y la función `fetchMaletasVuelo()` en el frontend, pero ningún componente la consume. El endpoint retorna `Maleta[]` con todas las maletas (físicas + virtuales) del vuelo.

## Goals / Non-Goals

**Goals:**
- Agregar sección "Todas las maletas del vuelo (X)" al final del modal, visible solo para tipo `vuelo`
- Mostrar lista plana con columnas: código_maleta, equipaje_id_externo, badge virtual/física, botón copiar
- Usar `fetchMaletasVuelo()` existente para cargar los datos en una sola llamada
- Mantener compatibilidad total con la funcionalidad existente (cards expandibles no se modifican)

**Non-Goals:**
- No cambiar backend ni API
- No modificar el comportamiento para tipo `nodo`
- No agregar nuevas columnas ni botones de acción por maleta (solo copiar)
- No modificar otros componentes fuera de ModalEnvios

## Decisions

1. **Llamada única vs lazy loading**: Se usa `fetchMaletasVuelo()` que trae todas las maletas de una vez, a diferencia del sistema actual que carga por equipaje. Esto evita N llamadas y permite una vista plana inmediata.

2. **Ubicación**: La sección se renderiza después de los equipajes expandibles (el usuario pidió "abajo"), separada visualmente por un divider.

3. **useEffect separado**: Se agrega un tercer `useEffect` (además de los dos existentes para planificado y equipajes) que solo se ejecuta cuando `tipo === 'vuelo'`. Sigue el mismo patrón de `cancelled` flag para seguridad.

4. **Estado inline vs reducer**: Se usa `useState` simple (no reducer) para la lista de maletas del vuelo, pues es un estado plano sin lógica de transiciones compleja.

5. **Misma paleta visual**: Reutiliza los mismos estilos de la lista de maletas existente (fondo, bordes, tipografía mono, badge virtual, botón copiar con icono Check/Copy) para consistencia.

## Risks / Trade-offs

- **Rendimiento**: Si un vuelo tiene cientos de maletas, la lista puede ser larga. Mitigación: el contenedor tiene `max-h` y scroll, y el endpoint tiene límites implícitos.
- **Redundancia**: Las maletas ya se ven expandiendo cada equipaje. La nueva vista es un atajo para ver todo junto, no un reemplazo.
