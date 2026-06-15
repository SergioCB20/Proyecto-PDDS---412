package com.tasfb2b.backend.bc1.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Statement;
import java.util.stream.Collectors;

@Component
public class NodoVueloSeeder {

    private static final Logger log = LoggerFactory.getLogger(NodoVueloSeeder.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private NodoLogisticoRepository nodoRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        if (nodoRepository.count() > 0) {
            log.info("NodoVueloSeeder: nodos ya existen, omitiendo seed");
            return;
        }

        log.info("NodoVueloSeeder: ejecutando seed de nodos y vuelos (asíncrono)...");
        Thread seedThread = new Thread(this::executeSeed, "nodo-vuelo-seeder");
        seedThread.start();
    }

    private void executeSeed() {
        try {
            ClassPathResource resource = new ClassPathResource("db/migration/V20__seed_nodos_vuelos.sql");
            String sql;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                sql = reader.lines().collect(Collectors.joining("\n"));
            }

            String cleanSql = removeCommentLines(sql);

            Connection conn = DataSourceUtils.getConnection(dataSource);
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(cleanSql);
            }

            jdbcTemplate.update("UPDATE vuelos SET es_plantilla = true, fecha_operacion = '2026-01-15' WHERE codigo_vuelo LIKE 'TAS%'");
            long plantillasCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM vuelos WHERE es_plantilla = true", Long.class);
            log.info("NodoVueloSeeder: {} vuelos marcados como plantilla", plantillasCount);

            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/Bogota'              WHERE codigo_iata = 'SKBO'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/Guayaquil'           WHERE codigo_iata = 'SEQM'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/Caracas'             WHERE codigo_iata = 'SVMI'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/Sao_Paulo'           WHERE codigo_iata = 'SBBR'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/Lima'                WHERE codigo_iata = 'SPIM'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/La_Paz'              WHERE codigo_iata = 'SLLP'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/Santiago'            WHERE codigo_iata = 'SCEL'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/Argentina/Buenos_Aires' WHERE codigo_iata = 'SABE'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/Asuncion'            WHERE codigo_iata = 'SGAS'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'America/Montevideo'          WHERE codigo_iata = 'SUAA'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Tirane'               WHERE codigo_iata = 'LATI'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Berlin'               WHERE codigo_iata = 'EDDI'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Vienna'               WHERE codigo_iata = 'LOWW'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Brussels'             WHERE codigo_iata = 'EBCI'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Minsk'                WHERE codigo_iata = 'UMMS'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Sofia'                WHERE codigo_iata = 'LBSF'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Prague'               WHERE codigo_iata = 'LKPR'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Zagreb'               WHERE codigo_iata = 'LDZA'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Copenhagen'           WHERE codigo_iata = 'EKCH'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Europe/Amsterdam'            WHERE codigo_iata = 'EHAM'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Kolkata'                WHERE codigo_iata = 'VIDP'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Damascus'               WHERE codigo_iata = 'OSDI'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Riyadh'                 WHERE codigo_iata = 'OERK'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Dubai'                  WHERE codigo_iata = 'OMDB'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Kabul'                  WHERE codigo_iata = 'OAKB'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Muscat'                 WHERE codigo_iata = 'OOMS'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Aden'                   WHERE codigo_iata = 'OYSN'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Karachi'                WHERE codigo_iata = 'OPKC'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Baku'                   WHERE codigo_iata = 'UBBB'");
            jdbcTemplate.update("UPDATE nodos_logisticos SET zona_horaria = 'Asia/Amman'                  WHERE codigo_iata = 'OJAI'");

            long nodos = nodoRepository.count();
            log.info("NodoVueloSeeder: seed completado — {} nodos", nodos);

        } catch (Exception e) {
            log.error("NodoVueloSeeder: error ejecutando seed: {}", e.getMessage(), e);
        }
    }

    private String removeCommentLines(String sql) {
        StringBuilder sb = new StringBuilder();
        for (String line : sql.split("\n")) {
            String trimmed = line.trim();
            if (!trimmed.startsWith("--") && !trimmed.startsWith("/*") && !trimmed.startsWith("*")) {
                sb.append(line).append("\n");
            }
        }
        return sb.toString().trim();
    }
}
