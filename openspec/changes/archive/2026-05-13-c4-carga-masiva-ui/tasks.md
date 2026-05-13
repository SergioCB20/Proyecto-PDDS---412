# Tareas C4: UI de Carga Masiva

## Estado: ✅ COMPLETADO

### Tareas

- [x] **C4.1** - Crear modal de carga masiva en página de operación
- [x] **C4.2** - Implementar parseo de archivo CSV con validación de headers
- [x] **C4.3** - Validar datos contra nodos y vuelos existentes
- [x] **C4.4** - Mostrar preview de registros válidos y con errores
- [x] **C4.5** - Integrar con endpoint de confirmación `/equipajes/carga-masiva/confirmar`
- [x] **C4.6** - Agregar tipos TypeScript para carga masiva

### Notas

- La UI está implementada sin backend (solo frontend)
- El endpoint de confirmación está preparado pero requiere backend
- Formato CSV esperado: `id_equipaje, destino_iata, vuelo_id, sla_horas`