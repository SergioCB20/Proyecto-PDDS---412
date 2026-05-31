## 1. Crear enum Continente

- [x] 1.1 Crear `backend/.../bc1/domain/Continente.java` con valores `AMERICA_DEL_SUR`, `EUROPA`, `ASIA`

## 2. Agregar campo continente a NodoLogistico

- [x] 2.1 Agregar campo `continente` (enum) con `@Enumerated(EnumType.STRING)`
- [x] 2.2 Agregar getter/setter y actualizar constructor
- [x] 2.3 Agregar mapa estático `Continente CONTINENTE_MAP` con clasificación de los 30 aeropuertos
- [x] 2.4 Agregar método `continentePorIata(String codigoIata)` 

## 3. Actualizar repositorio y seeder

- [x] 3.1 Agregar `findByContinenteIsNull()` a `NodoLogisticoRepository`
- [x] 3.2 Agregar `poblarContinentes()` a `NodoVueloSeeder` para nodos existentes

## 4. Actualizar seed SQL

- [x] 4.1 Agregar columna `continente` al INSERT de `V20__seed_nodos_vuelos.sql`

## 5. Auto-calcular SLA en EquipajeService

- [x] 5.1 Eliminar `sla_comprometido` de `RegistrarEquipajeRequest`
- [x] 5.2 En `registrar()`: calcular SLA según continentes y asignar a equipaje + cola
- [x] 5.3 En `actualizar()`: recalcular SLA usando vuelo.origen vs destino

## 6. Auto-calcular SLA en CargaMasivaService

- [x] 6.1 Eliminar `slaComprometido` de `RegistroPreview`
- [x] 6.2 Cambiar formato CSV de 4 a 3 columnas
- [x] 6.3 En `confirmar()`: calcular SLA automáticamente

## 7. Actualizar frontend types

- [x] 7.1 Eliminar `sla_comprometido` de `CrearEquipajeRequest`
- [x] 7.2 Eliminar `sla_comprometido` de `CargaMasivaRegistro`

## 8. Actualizar frontend operacion/page.tsx

- [x] 8.1 Eliminar `slaComprometido` del estado del formulario
- [x] 8.2 Eliminar validación de SLA
- [x] 8.3 Eliminar conversión SLA en handleSubmit
- [x] 8.4 Eliminar campo Input de SLA del formulario
- [x] 8.5 Actualizar formato CSV a 3 columnas
- [x] 8.6 Eliminar columna SLA de tabla de preview

## 9. Documentar en openspec

- [x] 9.1 Crear change `sla-automatico` con proposal, design, tasks
- [x] 9.2 Actualizar `openspec/specs/database-schema.md`
- [x] 9.3 Actualizar `openspec/specs/bc1-gestion-operativa.md`
- [x] 9.4 Actualizar `openspec/specs/api-contracts.md`
