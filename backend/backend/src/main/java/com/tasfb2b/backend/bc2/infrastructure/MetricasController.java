package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.bc2.application.MetricasSesionResponse;
import com.tasfb2b.backend.bc2.application.ReporteService;
import com.tasfb2b.backend.bc2.application.SesionService;
import com.tasfb2b.backend.bc2.application.SimulacionPlanificador;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sesiones")
public class MetricasController {

    private final SesionService sesionService;
    private final ReporteService reporteService;
    private final SimulacionPlanificador simulacionPlanificador;

    public MetricasController(SesionService sesionService, ReporteService reporteService,
                              SimulacionPlanificador simulacionPlanificador) {
        this.sesionService = sesionService;
        this.reporteService = reporteService;
        this.simulacionPlanificador = simulacionPlanificador;
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

    @GetMapping("/{id}/ultima-planificacion")
    public ResponseEntity<?> obtenerUltimaPlanificacion(@PathVariable UUID id) {
        var plan = simulacionPlanificador.obtenerUltimaPlanificacion(id);
        if (plan == null) {
            return ResponseEntity.noContent().build();
        }
        var planificados = sesionService.obtenerDatosUltimosPlanificados(plan.equipajesEnrutados());
        return ResponseEntity.ok(Map.of(
            "tiempo_ms", plan.tiempoMs(),
            "planificados", planificados
        ));
    }

    @GetMapping("/{id}/rutas/csv")
    public ResponseEntity<byte[]> descargarRutasCsv(@PathVariable UUID id) {
        String csv = reporteService.generarCsvRutas(id);
        // BOM UTF-8 para que Excel respete acentos; bytes explicitos evitan que el
        // StringHttpMessageConverter use ISO-8859-1 por defecto en text/*.
        byte[] cuerpo = ("﻿" + csv).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rutas_sesion_" + id + ".csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(cuerpo);
    }
}
