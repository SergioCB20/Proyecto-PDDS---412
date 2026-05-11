# Design: Backend BC1 Events + BC3 Auditoria — TAS FB2B

## Eventos Publicados

### EquipajeIngresadoEvent (EquipajeService.java)
```java
eventPublisher.publishEvent(new EquipajeIngresadoEvent(equipaje.getId(), OffsetDateTime.now()));
```
- Se ejecuta inmediatamente despues de guardar el equipaje
- Parametros: equipajeId, timestamp

### VueloCanceladoEvent (CancelacionService.java)
```java
eventPublisher.publishEvent(new VueloCanceladoEvent(vuelo.getId(), OffsetDateTime.now(), request.causa()));
```
- Se ejecuta inmediatamente despues de marcar vuelo como CANCELADO
- Parametros: vueloId, timestamp, causa

## Validacion PUT /usuarios

- Solo se permite cambiar el campo `nombre`
- Si se intenta cambiar `rol` o `nodoRefId`, lanzar ActualizacionNoPermitidaException (403)
- Auditoria ya estaba implementada en crear(), actualizar(), cambiarEstado()

## Exception Handlers

| Excepcion | HTTP Status | Codigo |
|-----------|-------------|--------|
| ValidacionException | 400 | VALIDACION |
| CancelacionInvalidaException | 400 | CANCELACION_INVALIDA |
| VueloNoEncontradoException | 404 | VUELO_NO_ENCONTRADO |
| EquipajeNoEncontradoException | 404 | EQUIPAJE_NO_ENCONTRADO |
| UsuarioNoEncontradoException | 404 | USUARIO_NO_ENCONTRADO |
| CorreoYaExisteException | 409 | CORREO_YA_EXISTE |
| ActualizacionNoPermitidaException | 403 | ACTUALIZACION_NO_PERMITIDA |
| RolNoEncontradoException | 400 | ROL_NO_ENCONTRADO |