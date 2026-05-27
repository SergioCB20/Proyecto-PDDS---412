package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.VueloService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/vuelos")
public class VueloController {

    private final VueloService vueloService;

    public VueloController(VueloService vueloService) {
        this.vueloService = vueloService;
    }

    @GetMapping
    public ResponseEntity<VueloService.VueloPageResponse> listar(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String destino_iata,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fecha_desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fecha_hasta,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(vueloService.listar(estado, destino_iata, fecha_desde, fecha_hasta, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(vueloService.obtener(id));
        } catch (VueloService.VueloNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", 404, "error", "NO_ENCONTRADO", "mensaje", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody VueloService.CrearVueloRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(vueloService.crear(request));
        } catch (VueloService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity()
                    .body(Map.of("status", 422, "error", "VALIDACION", "mensaje", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable UUID id, @RequestBody VueloService.CrearVueloRequest request) {
        try {
            return ResponseEntity.ok(vueloService.actualizar(id, request));
        } catch (VueloService.VueloNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", 404, "error", "NO_ENCONTRADO", "mensaje", e.getMessage()));
        } catch (VueloService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity()
                    .body(Map.of("status", 422, "error", "VALIDACION", "mensaje", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable UUID id) {
        try {
            vueloService.eliminar(id);
            return ResponseEntity.noContent().build();
        } catch (VueloService.VueloNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", 404, "error", "NO_ENCONTRADO", "mensaje", e.getMessage()));
        } catch (VueloService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity()
                    .body(Map.of("status", 422, "error", "VALIDACION", "mensaje", e.getMessage()));
        }
    }
}