package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.CargaSimulacionService;
import com.tasfb2b.backend.bc1.application.CargaSimulacionService.CargaProgreso;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
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

    /**
     * Carga acotada a la ventana de días que se va a simular, sobre el juego de datos del
     * escenario indicado (`colapso=true` usa el dataset exclusivo del colapso).
     *
     * <p>Pensado para la estrategia de aproximación sucesiva a la fecha de colapso: cargar el
     * dataset completo son decenas de millones de filas, mientras que una corrida de 5 días
     * usa una fracción mínima. Ej:
     * {@code POST /api/admin/carga-ventana?desde=2028-12-01&hasta=2028-12-05&colapso=true}
     */
    @PostMapping("/carga-ventana")
    public ResponseEntity<?> ejecutarCargaVentana(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "false") boolean colapso,
            @RequestParam(defaultValue = "true") boolean force) {
        if (hasta.isBefore(desde)) {
            return ResponseEntity.badRequest().body(Map.of("error", "hasta debe ser >= desde"));
        }
        try {
            CargaSimulacionService.ResultadoCarga r =
                    cargaSimulacionService.cargarVentana(force, desde, hasta, colapso);
            return ResponseEntity.ok(Map.of(
                    "total_equipajes", r.totalEquipajes(),
                    "total_lineas", r.totalLineas(),
                    "errores", r.lineasError(),
                    "desde", desde.toString(),
                    "hasta", hasta.toString(),
                    "dataset", cargaSimulacionService.rutaDe(colapso)
            ));
        } catch (CargaSimulacionService.CargaException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Vacía TODOS los envíos (equipajes, maletas, planes, segmentos, cola y ocupación).
     * Necesario antes de una corrida de colapso: purgar por aeropuerto con DELETE tarda
     * horas por el CASCADE sobre maletas, mientras que TRUNCATE tarda segundos.
     *
     * <p>Es destructivo e irreversible, así que exige confirmar explícitamente:
     * {@code POST /api/admin/purgar-envios?confirmar=SI}
     */
    @PostMapping("/purgar-envios")
    public ResponseEntity<?> purgarEnvios(@RequestParam(defaultValue = "") String confirmar) {
        if (!"SI".equals(confirmar)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Operacion destructiva: repetir con ?confirmar=SI"));
        }
        long eliminados = cargaSimulacionService.purgarTodosLosEnvios();
        return ResponseEntity.ok(Map.of(
                "equipajes_eliminados", eliminados,
                "mensaje", "Envios purgados. Listo para cargar una ventana."));
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
