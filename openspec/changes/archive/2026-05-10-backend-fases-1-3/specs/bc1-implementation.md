# BC1 Implementation Spec

## Status: IMPLEMENTED

## Implementation Notes

### Package Structure
```
com.tasfb2b.backend.bc1/
├── domain/
│   ├── PlanVuelos.java
│   ├── NodoLogistico.java
│   ├── Vuelo.java
│   ├── Equipaje.java
│   ├── PlanViaje.java
│   ├── SegmentoPlan.java
│   ├── EstadoVuelo.java (enum)
│   ├── EstadoEquipaje.java (enum)
│   ├── EstadoSla.java (enum)
│   ├── UbicacionTipo.java (enum)
│   └── EstadoSegmento.java (enum)
├── application/
│   ├── NodoService.java
│   ├── VueloService.java
│   ├── EquipajeService.java
│   └── CancelacionService.java
└── infrastructure/
    ├── NodoController.java
    ├── VueloController.java
    ├── EquipajeController.java
    ├── CancelacionController.java
    ├── PlanVuelosRepository.java
    ├── NodoLogisticoRepository.java
    ├── VueloRepository.java (JpaSpecificationExecutor)
    ├── EquipajeRepository.java
    ├── PlanViajeRepository.java
    └── SegmentoPlanRepository.java
```

### Key Implementation Details

#### EquipajeService.registrar()
1. Obtiene nodo origen del token JWT (o default LIM)
2. Valida destino IATA existe
3. Valida vuelo existe y esta PROGRAMADO
4. Valida carga_disponible > 0
5. Valida ocupacion_actual < capacidad_almacen
6. Crea Equipaje con estado ENRUTADO
7. Crea PlanViaje con ubicacion inicial en el vuelo
8. Crea SegmentoPlan
9. Incrementa ocupacion_actual del nodo
10. Decrementa carga_disponible del vuelo

#### VueloService.listar()
- Usa JpaSpecificationExecutor para filtros dinamicos
- Filtros: estado, rango de fechas
- Filtro por destino IATA NO implementado en esta fase

#### CancelacionService.cancelar()
- Solo permite cancelar PROGRAMADO o EN_RUTA
- Cambia estado vuelo a CANCELADO
- Cambia equipajes afectados a EN_REPLANIFICACION
- Retorna ID de lote para replanificacion futura

### Seed BC1 (DataSeeder)

**5 Nodos:**
| Codigo | Nombre | Latitud | Longitud | Capacidad |
|--------|--------|---------|----------|-----------|
| LIM | Aeropuerto Jorge Chavez | -12.0219 | -77.1143 | 500 |
| MIA | Miami International | 25.7959 | -80.2870 | 800 |
| BOG | El Dorado | 4.7016 | -74.1469 | 600 |
| GRU | Sao Paulo Guarulhos | -23.4356 | -46.4731 | 700 |
| SCL | Arturo Merino Benitez | -33.3930 | -70.7858 | 400 |

**10 Vuelos:** Todos PROGRAMADO, capacidad 120-200 unidades

### Migrations

- V5__plan_vuelos.sql
- V6__nodos_logisticos.sql
- V7__vuelos.sql
- V8__planes_viaje.sql
- V9__equipajes.sql
- V10__segmentos_plan.sql