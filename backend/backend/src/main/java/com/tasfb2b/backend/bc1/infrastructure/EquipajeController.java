package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.CargaMasivaService;
import com.tasfb2b.backend.bc1.application.EquipajeService;
import com.tasfb2b.backend.bc1.application.PlanViajePdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/equipajes")
public class EquipajeController {

    private final EquipajeService equipajeService;
    private final CargaMasivaService cargaMasivaService;
    private final PlanViajePdfService planViajePdfService;

    public EquipajeController(EquipajeService equipajeService, CargaMasivaService cargaMasivaService,
                              PlanViajePdfService planViajePdfService) {
        this.equipajeService = equipajeService;
        this.cargaMasivaService = cargaMasivaService;
        this.planViajePdfService = planViajePdfService;
    }

    @PostMapping
    public ResponseEntity<?> registrar(
            @RequestHeader(value = "X-Device-Nodo-Id", required = false) String nodoIdHeader,
            @RequestBody EquipajeService.RegistrarEquipajeRequest request) {
        try {
            UUID nodoId = nodoIdHeader != null ? UUID.fromString(nodoIdHeader) : null;
            if (nodoId == null) {
                throw new EquipajeService.ValidacionException(
                    "Nodo de origen no especificado. Envie X-Device-Nodo-Id en el header.");
            }
            var response = equipajeService.registrar(nodoId, request);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
        }
    }

    @PostMapping("/carga-masiva")
    public ResponseEntity<?> cargaMasiva(
            @RequestHeader(value = "X-Device-Nodo-Id", required = false) String nodoIdHeader,
            @RequestParam("archivo") MultipartFile archivo) {
        try {
            UUID nodoId = nodoIdHeader != null ? UUID.fromString(nodoIdHeader) : null;
            if (nodoId == null) {
                throw new EquipajeService.ValidacionException(
                    "Nodo de origen no especificado. Envie X-Device-Nodo-Id en el header.");
            }
            CargaMasivaService.PreviewResponse response = cargaMasivaService.procesarCsv(archivo, nodoId);
            return ResponseEntity.ok(response);
        } catch (CargaMasivaService.CargaException e) {
            return ResponseEntity.badRequest().body(error(400, "CARGA_INVALIDA", e.getMessage()));
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
        }
    }

    @PostMapping("/carga-masiva/confirmar")
    public ResponseEntity<?> confirmarCargaMasiva(
            @RequestHeader(value = "X-Device-Nodo-Id", required = false) String nodoIdHeader,
            @RequestBody CargaMasivaService.ConfirmarRequest request) {
        try {
            UUID nodoId = nodoIdHeader != null ? UUID.fromString(nodoIdHeader) : null;
            if (nodoId == null) {
                throw new EquipajeService.ValidacionException(
                    "Nodo de origen no especificado. Envie X-Device-Nodo-Id en el header.");
            }
            CargaMasivaService.ConfirmarResponse response = cargaMasivaService.confirmar(request, nodoId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (CargaMasivaService.CargaException e) {
            return ResponseEntity.badRequest().body(error(400, "CONFIRMAR_INVALIDO", e.getMessage()));
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable UUID id, @RequestBody EquipajeService.RegistrarEquipajeRequest request) {
        try {
            return ResponseEntity.ok(equipajeService.actualizar(id, request));
        } catch (EquipajeService.EquipajeNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(404, "NO_ENCONTRADO", e.getMessage()));
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
        }
    }

    @DeleteMapping("/{idExterno}")
    public ResponseEntity<?> eliminar(@PathVariable String idExterno) {
        try {
            equipajeService.eliminarPorIdExterno(idExterno);
            return ResponseEntity.noContent().build();
        } catch (EquipajeService.EquipajeNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(404, "NO_ENCONTRADO", e.getMessage()));
        }
    }

    @GetMapping("/{id}/plan-viaje")
    public ResponseEntity<?> obtenerPlanViaje(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(equipajeService.obtenerDetallePlanViaje(id));
        } catch (EquipajeService.EquipajeNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(error(404, "NO_ENCONTRADO", e.getMessage()));
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
        }
    }

    @GetMapping("/{id}/plan-viaje/descargar")
    public ResponseEntity<?> descargarPlanViaje(@PathVariable UUID id) {
        try {
            byte[] pdf = planViajePdfService.generarPdf(id);
            String filename = "plan-viaje-" + id.toString().substring(0, 8)
                    + "_" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + ".pdf";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", filename);
            return ResponseEntity.ok().headers(headers).body(pdf);
        } catch (EquipajeService.EquipajeNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(error(404, "NO_ENCONTRADO", e.getMessage()));
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> listar(
            @RequestParam(required = false) String vuelo_id,
            @RequestParam(required = false) String estado,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(equipajeService.listarEquipajes(vuelo_id, estado, page, size));
    }

    @GetMapping("/recientes")
    public ResponseEntity<?> recientes(
            @RequestParam(defaultValue = "4") int horas,
            @RequestParam(required = false) String desde) {
        return ResponseEntity.ok(equipajeService.obtenerEntregadosRecientes(horas, desde));
    }

    @GetMapping("/envios-panel")
    public ResponseEntity<?> enviosPanel(
            @RequestParam String tipo,
            @RequestParam(required = false) String origen_iata,
            @RequestParam(required = false) String destino_iata,
            @RequestParam(required = false) String codigo_equipaje) {
        try {
            return ResponseEntity.ok(equipajeService.obtenerEnviosPanel(tipo, origen_iata, destino_iata, codigo_equipaje));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("status", 400, "error", "PARAMETRO_INVALIDO", "mensaje", e.getMessage()));
        }
    }

    @GetMapping("/metricas")
    public ResponseEntity<?> metricas(@RequestParam(required = false) String desde) {
        return ResponseEntity.ok(equipajeService.obtenerMetricasOperacion(desde));
    }

    @GetMapping("/{idExterno}/maletas")
    public ResponseEntity<?> maletasDeEquipaje(@PathVariable String idExterno) {
        try {
            var equipaje = equipajeService.buscarPorIdExterno(idExterno);
            if (equipaje == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(error(404, "NO_ENCONTRADO", "Equipaje no encontrado: " + idExterno));
            }
            var maletas = equipajeService.listarMaletasEquipaje(equipaje.getId())
                    .stream().map(EquipajeController::toMaletaResponse).toList();
            return ResponseEntity.ok(maletas);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(error(500, "ERROR_INTERNO", e.getMessage()));
        }
    }

    private static EquipajeService.MaletaResponse toMaletaResponse(com.tasfb2b.backend.bc1.domain.Maleta m) {
        return new EquipajeService.MaletaResponse(
                m.getId().toString(),
                m.getCodigoMaleta(),
                m.getEquipaje() != null ? m.getEquipaje().getId() : null,
                m.getEquipaje() != null ? m.getEquipaje().getIdExterno() : null,
                m.getCreatedAt(),
                false
        );
    }

    private Map<String, Object> error(int status, String error, String mensaje) {
        return Map.of("status", status, "error", error, "mensaje", mensaje);
    }
}