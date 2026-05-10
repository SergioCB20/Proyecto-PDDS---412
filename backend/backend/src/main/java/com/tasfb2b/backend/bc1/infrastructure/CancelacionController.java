package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.CancelacionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/simulacion")
public class CancelacionController {

    private final CancelacionService cancelacionService;

    public CancelacionController(CancelacionService cancelacionService) {
        this.cancelacionService = cancelacionService;
    }

    @PostMapping("/cancelacion")
    public ResponseEntity<?> cancelar(@RequestBody CancelacionService.CancelacionRequest request) {
        try {
            CancelacionService.CancelacionResponse response = cancelacionService.cancelar(request);
            return ResponseEntity.ok(response);
        } catch (CancelacionService.VueloNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(error(404, "VUELO_NO_ENCONTRADO", e.getMessage()));
        } catch (CancelacionService.CancelacionInvalidaException e) {
            return ResponseEntity.unprocessableEntity()
                    .body(error(422, "CANCELACION_INVALIDA", e.getMessage()));
        }
    }

    private Map<String, Object> error(int status, String error, String mensaje) {
        return Map.of("status", status, "error", error, "mensaje", mensaje);
    }
}