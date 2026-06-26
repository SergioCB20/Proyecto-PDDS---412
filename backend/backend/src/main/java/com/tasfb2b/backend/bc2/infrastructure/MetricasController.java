package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.bc2.application.MetricasSesionResponse;
import com.tasfb2b.backend.bc2.application.ReporteService;
import com.tasfb2b.backend.bc2.application.SesionService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/sesiones")
public class MetricasController {

    private final SesionService sesionService;
    private final ReporteService reporteService;

    public MetricasController(SesionService sesionService, ReporteService reporteService) {
        this.sesionService = sesionService;
        this.reporteService = reporteService;
    }

    @GetMapping("/{id}/metricas")
    public ResponseEntity<MetricasSesionResponse> obtenerMetricas(@PathVariable UUID id) {
        MetricasSesionResponse response = sesionService.obtenerMetricas(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/reporte")
    public ResponseEntity<?> obtenerReporte(@PathVariable UUID id) {
        var reporte = reporteService.obtenerReporte(id);
        if (reporte == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(reporte);
    }

    @GetMapping("/{id}/rutas/csv")
    public ResponseEntity<String> descargarRutasCsv(@PathVariable UUID id) {
        String csv = reporteService.generarCsvRutas(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rutas_sesion_" + id + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
