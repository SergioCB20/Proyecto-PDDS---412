## 1. ModalEnvios — Botones en maletas expandidas por equipaje

- [x] 1.1 Agregar botones Seguir y Ruta a cada maleta en la lista expandida de cada equipaje (usar `m.equipaje_id` con handlers existentes)
- [x] 1.2 Mostrar spinner en botón Seguir/Ruta mientras carga

## 2. ModalEnvios — Botones en lista plana "Todas las maletas del vuelo"

- [x] 2.1 Agregar botones Seguir y Ruta a cada maleta en la nueva lista plana de maletas del vuelo
- [x] 2.2 Integrar con estados `siguiendoId`/`mostrandoRutaId` para feedback de carga

## 3. DetalleEnviosAeropuerto — Botones en maletas expandidas

- [x] 3.1 Agregar botones Seguir y Ruta a cada maleta en la lista expandida de cada equipaje

## 4. PanelEnviosMaletas — Expansión de filas + botones

- [x] 4.1 Importar `ChevronDown`, `ChevronRight`, `fetchMaletasEquipaje`
- [x] 4.2 Agregar estado `expandidos` para controlar qué filas están abiertas
- [x] 4.3 Agregar handler `handleToggleExpand` que llama `fetchMaletasEquipaje(item.codigo_equipaje)`
- [x] 4.4 Agregar chevron y lógica de expansión en cada fila de equipaje
- [x] 4.5 Renderizar lista de maletas al expandir, con botones Seguir y Ruta por maleta
- [x] 4.6 Mostrar badge virtual/física y spinner durante carga

## 5. Verificar

- [x] 5.1 Ejecutar `npm run lint` y verificar que no haya errores
