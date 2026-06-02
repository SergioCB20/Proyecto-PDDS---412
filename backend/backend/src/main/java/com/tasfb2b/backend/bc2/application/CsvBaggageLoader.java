package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.Continente;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class CsvBaggageLoader {

    private static final Logger log = LoggerFactory.getLogger(CsvBaggageLoader.class);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd-HH-mm");
    private static final int BATCH_SIZE = 1000;

    private final JdbcTemplate jdbcTemplate;

    public CsvBaggageLoader(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean estaBaseCargada() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM pedidos_base_simulados", Integer.class);
        return count != null && count > 0;
    }

    public void cargarBaseDatosSimulacion() {
        if (estaBaseCargada()) {
            log.info("Base de datos de simulacion ya cargada, omitiendo");
            return;
        }

        log.info("Iniciando carga de datos base de simulacion");
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:data/_envios_*.txt");

            if (resources.length == 0) {
                log.warn("No se encontraron archivos de envios en classpath:data/");
                return;
            }

            int total = 0;
            for (Resource resource : resources) {
                String filename = resource.getFilename();
                if (filename == null) continue;

                String origenIata = filename.replace("_envios_", "").replace(".txt", "").replace("_", "").trim();
                log.info("Procesando archivo {} para aeropuerto de origen {}", filename, origenIata);

                int count = 0;
                List<Object[]> batch = new ArrayList<>();
                try (BufferedReader br = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        line = line.trim();
                        if (line.isBlank()) continue;

                        LineaParseada parsed = parseLine(origenIata, line);
                        if (parsed == null) continue;

                        batch.add(new Object[]{
                            UUID.randomUUID(),
                            parsed.idPedido(),
                            parsed.origenIata(),
                            parsed.destinoIata(),
                            java.sql.Timestamp.from(parsed.sla().toInstant()),
                            java.sql.Timestamp.from(parsed.fechaIngreso().toInstant()),
                            parsed.cantidad()
                        });
                        count++;

                        if (count % BATCH_SIZE == 0) {
                            jdbcTemplate.batchUpdate(INSERT_BASE_SQL, batch);
                            batch.clear();
                        }
                    }
                    if (!batch.isEmpty()) {
                        jdbcTemplate.batchUpdate(INSERT_BASE_SQL, batch);
                    }
                } catch (Exception e) {
                    log.error("Error leyendo el archivo {}: {}", filename, e.getMessage());
                }
                log.info("Archivo {} procesado: {} registros", filename, count);
                total += count;
            }
            log.info("Carga base de simulacion completada: {} registros totales", total);

        } catch (Exception e) {
            log.error("Error al buscar archivos de envios para cargar: {}", e.getMessage());
        }
    }

    private static final String INSERT_BASE_SQL = "INSERT INTO pedidos_base_simulados (id, id_externo, origen_iata, destino_iata, sla_comprometido, fecha_ingreso_virtual, cantidad) VALUES (?, ?, ?, ?, ?, ?, ?)";

    private static final String HORIZONTE_DIAS = "60";

    private static final String COPY_SQL = "INSERT INTO equipajes_simulados (id, sesion_id, id_externo, origen_iata, destino_iata, sla_comprometido, fecha_ingreso_virtual, cantidad, procesado) SELECT gen_random_uuid(), ?, id_externo, origen_iata, destino_iata, sla_comprometido, fecha_ingreso_virtual, cantidad, false FROM pedidos_base_simulados WHERE fecha_ingreso_virtual >= ?::timestamptz AND fecha_ingreso_virtual < ?::timestamptz + INTERVAL '" + HORIZONTE_DIAS + " days'";

    @Transactional
    public void copiarASesion(UUID sesionId, String fechaInicio, String horaInicio) {
        String inicioStr = fechaInicio + "T" + horaInicio + "Z";
        int inserted = jdbcTemplate.update(COPY_SQL, sesionId, inicioStr, inicioStr);
        log.info("Copiados {} registros a equipajes_simulados para sesion {} desde {}", inserted, sesionId, inicioStr);
    }

    private LineaParseada parseLine(String origenIata, String line) {
        String[] partes = line.split("-");
        if (partes.length < 7) {
            log.warn("Linea mal formateada (se esperan 7 campos separados por -): {}", line);
            return null;
        }

        String idPedido = partes[0].trim();
        String fechaStr = partes[1] + "-" + partes[2] + "-" + partes[3];
        String destinoIata = partes[4].trim();

        int cantidad;
        try {
            cantidad = Integer.parseInt(partes[5].trim());
            if (cantidad < 1) cantidad = 1;
        } catch (NumberFormatException e) {
            log.warn("Cantidad invalida en linea: {} - {}", partes[5], line);
            cantidad = 1;
        }

        OffsetDateTime fechaIngreso;
        try {
            LocalDateTime ldt = LocalDateTime.parse(fechaStr, DATE_FORMAT);
            fechaIngreso = ldt.atOffset(ZoneOffset.UTC);
        } catch (Exception e) {
            log.warn("Fecha invalida en linea: {} - {}", fechaStr, line);
            return null;
        }

        Continente contOrigen = NodoLogistico.continentePorIata(origenIata);
        Continente contDestino = NodoLogistico.continentePorIata(destinoIata);

        long slaHoras;
        if (contOrigen != null && contDestino != null) {
            slaHoras = contOrigen == contDestino ? 24 : 48;
        } else {
            slaHoras = 48;
            log.warn("No se pudo determinar continente para {} o {}, usando SLA default 48h", origenIata, destinoIata);
        }

        OffsetDateTime sla = fechaIngreso.plusHours(slaHoras);

        return new LineaParseada(idPedido, origenIata, destinoIata, fechaIngreso, sla, cantidad);
    }

    private record LineaParseada(String idPedido, String origenIata, String destinoIata,
                                  OffsetDateTime fechaIngreso, OffsetDateTime sla, int cantidad) {}
}
