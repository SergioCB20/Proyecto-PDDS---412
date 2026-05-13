package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.ManifiestoService;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/manifiestos")
public class ManifiestoController {

    private final ManifiestoService manifiestoService;
    private final VueloRepository vueloRepository;

    public ManifiestoController(ManifiestoService manifiestoService, VueloRepository vueloRepository) {
        this.manifiestoService = manifiestoService;
        this.vueloRepository = vueloRepository;
    }

    @GetMapping("/{vuelo_id}")
    public ResponseEntity<?> descargarManifiesto(@PathVariable("vuelo_id") UUID vueloId) {
        try {
            byte[] pdf = manifiestoService.generarManifiesto(vueloId);

            Vuelo vuelo = vueloRepository.findById(vueloId).orElse(null);
            String filename = "manifiesto_" + (vuelo != null ? vuelo.getCodigoVuelo() : vueloId)
                    + "_" + java.time.LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + ".pdf";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", filename);

            return ResponseEntity.ok().headers(headers).body(pdf);
        } catch (ManifiestoService.VueloNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(error(404, "VUELO_NO_ENCONTRADO", e.getMessage()));
        } catch (ManifiestoService.ManifiestoVacioException e) {
            return ResponseEntity.unprocessableEntity()
                    .body(error(422, "MANIFIESTO_VACIO", e.getMessage()));
        }
    }

    private Map<String, Object> error(int status, String error, String mensaje) {
        return Map.of("status", status, "error", error, "mensaje", mensaje);
    }
}
