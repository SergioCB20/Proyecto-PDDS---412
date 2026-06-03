package com.tasfb2b.backend.shared;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        String errores = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(error(HttpStatus.BAD_REQUEST, "VALIDACION_FALLIDA", errores));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleMalformedJson(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(error(HttpStatus.BAD_REQUEST, "JSON_INVALIDO", "El cuerpo de la solicitud no es válido"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(error(HttpStatus.BAD_REQUEST, "ARGUMENTO_INVALIDO", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc1.application.EquipajeService.ValidacionException.class)
    public ResponseEntity<?> handleEquipajeValidation(com.tasfb2b.backend.bc1.application.EquipajeService.ValidacionException ex) {
        return ResponseEntity.unprocessableEntity().body(error(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDACION", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc1.application.CancelacionService.CancelacionInvalidaException.class)
    public ResponseEntity<?> handleCancelacionInvalida(com.tasfb2b.backend.bc1.application.CancelacionService.CancelacionInvalidaException ex) {
        return ResponseEntity.badRequest().body(error(HttpStatus.BAD_REQUEST, "CANCELACION_INVALIDA", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc1.application.CancelacionService.VueloNoEncontradoException.class)
    public ResponseEntity<?> handleVueloNoEncontrado(com.tasfb2b.backend.bc1.application.CancelacionService.VueloNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(HttpStatus.NOT_FOUND, "VUELO_NO_ENCONTRADO", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc1.application.EquipajeService.EquipajeNoEncontradoException.class)
    public ResponseEntity<?> handleEquipajeNoEncontrado(com.tasfb2b.backend.bc1.application.EquipajeService.EquipajeNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(HttpStatus.NOT_FOUND, "EQUIPAJE_NO_ENCONTRADO", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc1.application.CargaMasivaService.CargaException.class)
    public ResponseEntity<?> handleCarga(com.tasfb2b.backend.bc1.application.CargaMasivaService.CargaException ex) {
        return ResponseEntity.badRequest().body(error(HttpStatus.BAD_REQUEST, "CARGA_INVALIDA", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc1.application.ManifiestoService.VueloNoEncontradoException.class)
    public ResponseEntity<?> handleManifiestoVueloNoEncontrado(com.tasfb2b.backend.bc1.application.ManifiestoService.VueloNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(HttpStatus.NOT_FOUND, "VUELO_NO_ENCONTRADO", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc1.application.ManifiestoService.ManifiestoVacioException.class)
    public ResponseEntity<?> handleManifiestoVacio(com.tasfb2b.backend.bc1.application.ManifiestoService.ManifiestoVacioException ex) {
        return ResponseEntity.unprocessableEntity().body(error(HttpStatus.UNPROCESSABLE_ENTITY, "MANIFIESTO_VACIO", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc3.application.UsuarioService.UsuarioNoEncontradoException.class)
    public ResponseEntity<?> handleUsuarioNoEncontrado(com.tasfb2b.backend.bc3.application.UsuarioService.UsuarioNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(HttpStatus.NOT_FOUND, "USUARIO_NO_ENCONTRADO", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc3.application.UsuarioService.CorreoYaExisteException.class)
    public ResponseEntity<?> handleCorreoYaExiste(com.tasfb2b.backend.bc3.application.UsuarioService.CorreoYaExisteException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error(HttpStatus.CONFLICT, "CORREO_YA_EXISTE", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc3.application.UsuarioService.RolNoEncontradoException.class)
    public ResponseEntity<?> handleRolNoEncontrado(com.tasfb2b.backend.bc3.application.UsuarioService.RolNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error(HttpStatus.BAD_REQUEST, "ROL_NO_ENCONTRADO", ex.getMessage()));
    }

    @ExceptionHandler(com.tasfb2b.backend.bc3.application.UsuarioService.ActualizacionNoPermitidaException.class)
    public ResponseEntity<?> handleActualizacionNoPermitida(com.tasfb2b.backend.bc3.application.UsuarioService.ActualizacionNoPermitidaException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error(HttpStatus.FORBIDDEN, "ACTUALIZACION_NO_PERMITIDA", ex.getMessage()));
    }

    @ExceptionHandler(java.time.DateTimeException.class)
    public ResponseEntity<?> handleDateTime(java.time.DateTimeException ex) {
        return ResponseEntity.badRequest().body(error(HttpStatus.BAD_REQUEST, "FECHA_HORA_INVALIDA", ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    public ResponseEntity<?> handleDataAccess(org.springframework.dao.DataAccessException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_BD", "Error en la base de datos: " + ex.getMessage()));
    }

    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<?> handleNPE(NullPointerException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_INTERNO", "Error inesperado en el servidor"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_INTERNO", "Error interno del servidor"));
    }

    private Map<String, Object> error(HttpStatus status, String error, String mensaje) {
        return Map.of(
                "timestamp", OffsetDateTime.now().toString(),
                "status", status.value(),
                "error", error,
                "mensaje", mensaje
        );
    }
}