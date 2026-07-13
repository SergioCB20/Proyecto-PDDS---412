package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.OperacionTickService;
import com.tasfb2b.backend.bc2.application.CrearSesionRequest;
import com.tasfb2b.backend.bc2.application.ReporteService;
import com.tasfb2b.backend.bc2.application.SesionService;
import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.domain.TipoSesion;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/operacion")
public class OperacionController {

    private final SesionService sesionService;
    private final SesionRepository sesionRepository;
    private final OperacionTickService operacionTickService;
    private final ReporteService reporteService;

    public OperacionController(SesionService sesionService,
                               SesionRepository sesionRepository,
                               OperacionTickService operacionTickService,
                               ReporteService reporteService) {
        this.sesionService = sesionService;
        this.sesionRepository = sesionRepository;
        this.operacionTickService = operacionTickService;
        this.reporteService = reporteService;
    }

    @PostMapping("/iniciar")
    public ResponseEntity<Map<String, Object>> iniciar(
            @RequestHeader("X-Device-Id") String dispositivoId) {
        List<SesionEjecucion> activas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.EN_CURSO);
        if (!activas.isEmpty()) {
            SesionEjecucion existente = activas.get(0);
            return ResponseEntity.ok(Map.of(
                    "estado", "ACTIVO",
                    "sesion_id", existente.getId().toString()));
        }
        List<SesionEjecucion> pausadas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.PAUSADA);
        if (!pausadas.isEmpty()) {
            SesionEjecucion existente = pausadas.get(0);
            sesionService.iniciarSesion(existente.getId(), dispositivoId);
            return ResponseEntity.ok(Map.of(
                    "estado", "ACTIVO",
                    "sesion_id", existente.getId().toString()));
        }
        var crearReq = new CrearSesionRequest(
                "EN_VIVO", null, null, null, null, null, null, null, null, null);
        var creada = sesionService.crearSesion(crearReq, dispositivoId);
        sesionService.iniciarSesion(creada.id(), dispositivoId);
        return ResponseEntity.ok(Map.of(
                "estado", "ACTIVO",
                "sesion_id", creada.id().toString()));
    }

    @PostMapping("/pausar")
    public ResponseEntity<Map<String, Object>> pausar(
            @RequestHeader("X-Device-Id") String dispositivoId) {
        List<SesionEjecucion> activas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.EN_CURSO);
        if (activas.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("status", 409, "error", "SIN_SESION_ACTIVA",
                            "mensaje", "No hay sesion EN_VIVO activa"));
        }
        sesionService.pausarSesion(activas.get(0).getId(), dispositivoId);
        return ResponseEntity.ok(Map.of("estado", "PAUSADO"));
    }

    @PostMapping("/reanudar")
    public ResponseEntity<Map<String, Object>> reanudar(
            @RequestHeader("X-Device-Id") String dispositivoId) {
        List<SesionEjecucion> pausadas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.PAUSADA);
        if (pausadas.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("status", 409, "error", "SIN_SESION_PAUSADA",
                            "mensaje", "No hay sesion EN_VIVO pausada"));
        }
        sesionService.iniciarSesion(pausadas.get(0).getId(), dispositivoId);
        return ResponseEntity.ok(Map.of("estado", "ACTIVO"));
    }

    @PostMapping("/detener")
    public ResponseEntity<Map<String, Object>> detener(
            @RequestHeader("X-Device-Id") String dispositivoId) {
        List<SesionEjecucion> activas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.EN_CURSO);
        List<SesionEjecucion> pausadas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.PAUSADA);
        SesionEjecucion target = activas.isEmpty() ? (pausadas.isEmpty() ? null : pausadas.get(0)) : activas.get(0);
        if (target == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("status", 409, "error", "SIN_SESION",
                            "mensaje", "No hay sesion EN_VIVO activa o pausada"));
        }
        sesionService.detenerSesion(target.getId(), dispositivoId);
        return ResponseEntity.ok(Map.of("estado", "INACTIVO", "sesion_id", target.getId().toString()));
    }

    @GetMapping("/estado")
    public ResponseEntity<Map<String, Object>> estado() {
        List<SesionEjecucion> activas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.EN_CURSO);
        if (!activas.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "estado", "ACTIVO",
                    "sesion_id", activas.get(0).getId().toString()));
        }
        List<SesionEjecucion> pausadas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.PAUSADA);
        if (!pausadas.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "estado", "PAUSADO",
                    "sesion_id", pausadas.get(0).getId().toString()));
        }
        return ResponseEntity.ok(Map.of("estado", "INACTIVO"));
    }

    @GetMapping("/reporte")
    public ResponseEntity<?> obtenerReporte() {
        List<SesionEjecucion> finalizadas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.FINALIZADA);
        if (finalizadas.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        SesionEjecucion ultima = finalizadas.get(finalizadas.size() - 1);
        var reporte = reporteService.obtenerReporte(ultima.getId());
        if (reporte == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(reporte);
    }

    @GetMapping("/reporte/csv")
    public ResponseEntity<byte[]> descargarCsvOperacion() {
        List<SesionEjecucion> finalizadas = sesionRepository
                .findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.FINALIZADA);
        if (finalizadas.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        SesionEjecucion ultima = finalizadas.get(finalizadas.size() - 1);
        String csv = reporteService.generarCsvOperacionDiaria(ultima.getId());
        byte[] cuerpo = ("\ufeff" + csv).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=operacion_sesion_" + ultima.getId().toString().replace("-", "_") + ".csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(cuerpo);
    }
}
