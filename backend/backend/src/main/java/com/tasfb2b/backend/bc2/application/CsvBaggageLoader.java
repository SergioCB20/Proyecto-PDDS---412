package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc2.domain.EquipajeSimulado;
import com.tasfb2b.backend.bc2.infrastructure.EquipajeSimuladoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class CsvBaggageLoader {

    private static final Logger log = LoggerFactory.getLogger(CsvBaggageLoader.class);
    private final EquipajeSimuladoRepository equipajeSimuladoRepository;

    public CsvBaggageLoader(EquipajeSimuladoRepository equipajeSimuladoRepository) {
        this.equipajeSimuladoRepository = equipajeSimuladoRepository;
    }

    public void cargarArchivosLocales(UUID sesionId) {
        log.info("Iniciando carga masiva de equipajes para simulacion {}", sesionId);
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:data/_envios_*.csv");

            if (resources.length == 0) {
                log.warn("No se encontraron archivos CSV para cargar en classpath:data/");
                return;
            }

            for (Resource resource : resources) {
                String filename = resource.getFilename();
                if (filename == null) continue;
                
                // Ej: _envios_LIM.csv -> LIM
                String origenIata = filename.replace("_envios_", "").replace(".csv", "").trim();
                log.info("Procesando archivo {} para aeropuerto de origen {}", filename, origenIata);

                List<EquipajeSimulado> lote = new ArrayList<>();
                try (BufferedReader br = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    boolean header = true;
                    while ((line = br.readLine()) != null) {
                        if (header) {
                            header = false;
                            continue; // Saltar cabecera
                        }

                        String[] cols = line.split(",");
                        if (cols.length < 4) continue;

                        EquipajeSimulado eq = new EquipajeSimulado();
                        eq.setSesionId(sesionId);
                        eq.setIdExterno(cols[0].trim());
                        eq.setOrigenIata(origenIata);
                        eq.setDestinoIata(cols[1].trim());
                        eq.setSlaComprometido(OffsetDateTime.parse(cols[2].trim()));
                        eq.setFechaIngresoVirtual(OffsetDateTime.parse(cols[3].trim()));

                        if (cols.length > 4 && !cols[4].trim().isEmpty()) {
                            try {
                                eq.setVueloId(UUID.fromString(cols[4].trim()));
                            } catch (Exception ignored) {}
                        }

                        lote.add(eq);

                        if (lote.size() >= 1000) {
                            equipajeSimuladoRepository.saveAll(lote);
                            lote.clear();
                        }
                    }
                    if (!lote.isEmpty()) {
                        equipajeSimuladoRepository.saveAll(lote);
                    }
                } catch (Exception e) {
                    log.error("Error leyendo el archivo {}: {}", filename, e.getMessage());
                }
            }
            log.info("Carga masiva completada para sesion {}", sesionId);

        } catch (Exception e) {
            log.error("Error al buscar archivos CSV para cargar: {}", e.getMessage());
        }
    }
}
