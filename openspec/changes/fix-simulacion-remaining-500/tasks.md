## 1. Vuelo.java — Prevenir LazyInitializationException

- [x] 1.1 Agregar `@JsonIgnore` en el getter `getPlanVuelos()` de `Vuelo.java` para evitar que Jackson intente serializar la relación LAZY

## 2. application.properties — Tolerancia general a lazy loading

- [x] 2.1 Agregar `spring.jpa.properties.hibernate.enable_lazy_load_no_trans=true` en `application.properties`

## 3. SesionService.java — Protección adicional

- [x] 3.1 Envolver `vueloService.clonarPlantillas()` en try-catch en `iniciarSesion()` (línea 120)
- [x] 3.2 Agregar null-safety para `getDuracionDias()` en `iniciarSesion()` (línea 133), usar 5 como default si es null

## 4. GlobalExceptionHandler — Handler para IllegalStateException

- [x] 4.1 Agregar `@ExceptionHandler` para `IllegalStateException` → 400 BAD_REQUEST con error `ESTADO_INVALIDO`

## 5. Verificación

- [x] 5.1 Ejecutar compilación del backend (`mvnw compile`) para asegurar que no hay errores de sintaxis
- [ ] 5.2 Verificar que `GET /api/vuelos?size=50` retorna 200 sin errores
- [ ] 5.3 Verificar que `POST /api/sesiones/{id}/iniciar` retorna 200 sin errores
