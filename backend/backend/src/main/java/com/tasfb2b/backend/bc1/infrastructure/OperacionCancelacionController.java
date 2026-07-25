package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.CancelacionService;
import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import com.tasfb2b.backend.bc2.domain.TipoSesion;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/operacion")
public class OperacionCancelacionController {

    private final CancelacionService cancelacionService;
    private final SesionRepository sesionRepository;

    public OperacionCancelacionController(CancelacionService cancelacionService, SesionRepository sesionRepository) {
        this.cancelacionService = cancelacionService;
        this.sesionRepository = sesionRepository;
    }

    @PostMapping("/cancelacion")
    public ResponseEntity<?> cancelar(@RequestBody CancelacionService.CancelacionRequest request) {
        UUID vueloId = request.vuelo_id();
        UUID sesionId = resolveSesionId(request.sesion_id());
        if (sesionId == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "status", 409, "error", "SIN_SESION_EN_VIVO", "mensaje", "No hay sesion EN_VIVO activa"
            ));
        }
        try {
            var response = cancelacionService.cancelar(new CancelacionService.CancelacionRequest(
                vueloId, request.causa(), sesionId, request.aplicar_regla_plantilla()
            ));
            return ResponseEntity.ok(response);
        } catch (CancelacionService.VueloNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(404, "VUELO_NO_ENCONTRADO", e.getMessage()));
        } catch (CancelacionService.CancelacionInvalidaException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "Cancelacion invalida", e.getMessage()));
        }
    }

    private UUID resolveSesionId(UUID provided) {
        if (provided != null) return provided;
        var activas = sesionRepository.findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.EN_CURSO);
        if (!activas.isEmpty()) return activas.get(0).getId();
        var pausadas = sesionRepository.findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.PAUSADA);
        if (!pausadas.isEmpty()) return pausadas.get(0).getId();
        return null;
    }

    private Map<String, Object> error(int status, String error, String msg) {
        return Map.of("status", status, "error", error, "mensaje", msg);
    }
}