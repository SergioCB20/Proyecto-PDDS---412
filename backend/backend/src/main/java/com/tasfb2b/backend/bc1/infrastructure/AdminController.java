package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.CargaSimulacionService;
import com.tasfb2b.backend.bc1.application.CargaSimulacionService.CargaProgreso;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final CargaSimulacionService cargaSimulacionService;

    public AdminController(CargaSimulacionService cargaSimulacionService) {
        this.cargaSimulacionService = cargaSimulacionService;
    }

    @PostMapping("/carga-simulacion")
    public ResponseEntity<?> ejecutarCargaSimulacion(
            @RequestParam(defaultValue = "false") boolean force,
            @RequestParam(defaultValue = "true") boolean async) {
        try {
            if (async) {
                String taskId = cargaSimulacionService.iniciarCargaAsync(force);
                return ResponseEntity.ok(Map.of(
                        "task_id", taskId,
                        "estado", "INICIANDO",
                        "mensaje", "Carga iniciada en background. Consultar GET /api/admin/carga-simulacion/status/" + taskId
                ));
            }
            CargaSimulacionService.ResultadoCarga resultado = cargaSimulacionService.cargarTodos(force);
            return ResponseEntity.ok(Map.of(
                    "total_equipajes", resultado.totalEquipajes(),
                    "total_lineas", resultado.totalLineas(),
                    "errores", resultado.lineasError()
            ));
        } catch (CargaSimulacionService.CargaException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/carga-simulacion/status/{taskId}")
    public ResponseEntity<?> statusCarga(@PathVariable String taskId) {
        CargaProgreso p = cargaSimulacionService.getProgreso(taskId);
        if (p == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> body = new HashMap<>();
        body.put("task_id", p.getTaskId());
        body.put("estado", p.getEstado());
        body.put("archivo_actual", p.getArchivoActual() != null ? p.getArchivoActual() : "");
        body.put("archivos_completados", p.getArchivosCompletados());
        body.put("archivos_total", p.getArchivosTotal());
        body.put("archivos_saltados", p.getArchivosSaltados());
        body.put("archivos_completos_previos", p.getArchivosCompletosPrevios());
        body.put("archivos_cargados_ahora", p.getArchivosCargadosAhora());
        body.put("lineas_procesadas", p.getLineasProcesadas());
        body.put("equipajes_insertados", p.getEquipajesInsertados());
        body.put("errores", p.getErrores());
        body.put("error_mensaje", p.getErrorMensaje() != null ? p.getErrorMensaje() : "");
        body.put("iniciado_en", p.getIniciadoEn() != null ? p.getIniciadoEn().toString() : "");
        body.put("actualizado_en", p.getActualizadoEn() != null ? p.getActualizadoEn().toString() : "");
        return ResponseEntity.ok(body);
    }
}
