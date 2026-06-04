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
import org.springframework.transaction.annotation.Transactional;

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
    @Transactional
    public void seed() {
        if (nodoRepository.count() > 0) {
            log.info("NodoVueloSeeder: nodos ya existen, omitiendo seed");
            return;
        }

        log.info("NodoVueloSeeder: ejecutando seed de nodos y vuelos...");

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
