package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.shared.SLACalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CargaSimulacionService {

    private static final Logger log = LoggerFactory.getLogger(CargaSimulacionService.class);
    private static final Pattern FILE_PATTERN = Pattern.compile("^_envios_([A-Z0-9]{4})_\\.txt$");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final int BATCH_SIZE = 1000;

    private final JdbcTemplate jdbcTemplate;
    private final NodoLogisticoRepository nodoRepository;
    private final String rutaArchivos;

    public CargaSimulacionService(JdbcTemplate jdbcTemplate,
                                  NodoLogisticoRepository nodoRepository,
                                  @Value("${app.simulacion.ruta-archivos}") String rutaArchivos) {
        this.jdbcTemplate = jdbcTemplate;
        this.nodoRepository = nodoRepository;
        this.rutaArchivos = rutaArchivos;
    }

    public ResultadoCarga cargarTodos() {
        return cargarTodos(false);
    }

    public ResultadoCarga cargarTodos(boolean force) {
        return cargarTodos(force, null);
    }

    private ResultadoArchivo procesarArchivo(File archivo, NodoLogistico nodoOrigen,
                                              Map<String, NodoLogistico> nodosPorCodigo) {
        int insertados = 0;
        int lineasProcesadas = 0;
        int lineasError = 0;

        List<Object[]> equipajesBatch = new ArrayList<>(BATCH_SIZE);

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new FileInputStream(archivo), StandardCharsets.UTF_8))) {

            String linea;
            while ((linea = reader.readLine()) != null) {
                linea = linea.trim();
                if (linea.isBlank()) continue;

                lineasProcesadas++;
                try {
                    DatosLinea datos = parsearLinea(linea, nodoOrigen.getCodigoIata());

                    NodoLogistico nodoDestino = nodosPorCodigo.get(datos.destinoCodigo);
                    if (nodoDestino == null) {
                        log.warn("Destino {} no encontrado, saltando línea: {}", datos.destinoCodigo, linea);
                        lineasError++;
                        continue;
                    }

                    ZoneId zonaOrigen = ZoneId.of(nodoOrigen.getZonaHoraria());
                    LocalDateTime fechaHoraLocal = LocalDateTime.of(datos.fecha, datos.hora);
                    OffsetDateTime fechaOperacion = fechaHoraLocal.atZone(zonaOrigen)
                            .toOffsetDateTime().withOffsetSameInstant(java.time.ZoneOffset.UTC);
                    var sla = SLACalculator.calcularSla(
                            nodoOrigen.getContinente(),
                            nodoDestino.getContinente(),
                            fechaHoraLocal,
                            zonaOrigen);

                    UUID equipajeId = UUID.randomUUID();

                    equipajesBatch.add(new Object[]{
                            equipajeId,
                            datos.origenCodigo,
                            datos.destinoCodigo,
                            datos.idExterno,
                            datos.cantidad,
                            sla,
                            fechaOperacion
                    });

                    if (equipajesBatch.size() >= BATCH_SIZE) {
                        try {
                            insertarBatch(equipajesBatch);
                            insertados += equipajesBatch.size();
                        } finally {
                            equipajesBatch.clear();
                        }
                    }
                } catch (Exception e) {
                    log.warn("Error procesando línea {}: {}", lineasProcesadas, e.getMessage());
                    lineasError++;
                }
            }

            if (!equipajesBatch.isEmpty()) {
                insertarBatch(equipajesBatch);
                insertados += equipajesBatch.size();
            }

        } catch (Exception e) {
            throw new CargaException("Error leyendo archivo " + archivo.getName() + ": " + e.getMessage());
        }

        return new ResultadoArchivo(insertados, lineasProcesadas, lineasError);
    }

    private void insertarBatch(List<Object[]> equipajes) {
        jdbcTemplate.batchUpdate(
                "INSERT INTO equipajes (id, origen_iata, destino_iata, estado, id_externo, cantidad, fecha_ingreso, sla_comprometido, fecha_operacion) " +
                        "VALUES (?, ?, ?, 'REGISTRADO', ?, ?, NOW(), ?, ?)",
                equipajes);

        // Cada equipaje crea `cantidad` maletas hijas con codigo_maleta UNIQUE
        // patron "MAL-{origen}-{id_externo}-NN" (origen incluido para evitar
        // colisiones entre archivos de distintos aeropuertos).
        List<Object[]> maletasBatch = new ArrayList<>(equipajes.size() * 2);
        OffsetDateTime ahora = OffsetDateTime.now();
        java.util.Set<String> codigosVistos = new java.util.HashSet<>();
        for (Object[] row : equipajes) {
            UUID equipajeId = (UUID) row[0];
            String origen = (String) row[1];
            String idExterno = (String) row[3];
            int cantidad = ((Number) row[4]).intValue();
            String prefijo = (origen + "-" + idExterno);
            if (prefijo.length() > 24) prefijo = prefijo.substring(0, 24);
            int ancho = String.valueOf(cantidad).length();
            for (int i = 1; i <= cantidad; i++) {
                String codigo = String.format("MAL-%s-%0" + ancho + "d", prefijo, i);
                int intentos = 0;
                while (codigosVistos.contains(codigo) && intentos < 5) {
                    prefijo = prefijo.length() > 1 ? prefijo.substring(0, prefijo.length() - 1) : prefijo;
                    ancho = ancho + 1;
                    codigo = String.format("MAL-%s-%0" + ancho + "d", prefijo, i);
                    intentos++;
                }
                codigosVistos.add(codigo);
                maletasBatch.add(new Object[]{
                        UUID.randomUUID(),  // id
                        codigo,              // codigo_maleta
                        equipajeId,          // equipaje_id
                        ahora                // created_at
                });
            }
        }
        if (!maletasBatch.isEmpty()) {
            jdbcTemplate.batchUpdate(
                    "INSERT INTO maletas (id, codigo_maleta, equipaje_id, created_at) VALUES (?, ?, ?, ?)",
                    maletasBatch);
        }
    }

    DatosLinea parsearLinea(String linea, String origenCodigo) {
        String[] partes = linea.split("-", -1);
        if (partes.length != 7) {
            throw new IllegalArgumentException(
                    "Formato inválido: se esperaban 7 campos, se obtuvieron " + partes.length);
        }

        String fechaStr = partes[1];
        String hh = partes[2];
        String mm = partes[3];
        String destinoCodigo = partes[4];
        String cantidadStr = partes[5];

        LocalDate fecha;
        try {
            fecha = LocalDate.parse(fechaStr, DATE_FORMAT);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Fecha inválida: " + fechaStr);
        }

        LocalTime hora;
        try {
            hora = LocalTime.of(Integer.parseInt(hh), Integer.parseInt(mm));
        } catch (Exception e) {
            throw new IllegalArgumentException("Hora inválida: " + hh + ":" + mm);
        }

        int cantidad;
        try {
            cantidad = Integer.parseInt(cantidadStr);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Cantidad inválida: " + cantidadStr);
        }

        return new DatosLinea(linea, origenCodigo, fecha, hora, destinoCodigo, cantidad);
    }

    record DatosLinea(String idExterno, String origenCodigo, LocalDate fecha, LocalTime hora,
                      String destinoCodigo, int cantidad) {}

    record ResultadoArchivo(int equipajesInsertados, int lineasProcesadas, int lineasError) {}

    public record ResultadoCarga(int totalEquipajes, int totalLineas, int lineasError) {}

    public static class CargaException extends RuntimeException {
        public CargaException(String msg) { super(msg); }
    }

    // --- Progreso async ---

    private final ConcurrentHashMap<String, CargaProgreso> progresos = new ConcurrentHashMap<>();

    public static class CargaProgreso {
        private String taskId;
        private String estado; // INICIANDO, TRUNCADO, CARGANDO, COMPLETADO, ERROR
        private String archivoActual;
        private int archivosCompletados;
        private int archivosTotal;
        private int archivosSaltados;
        private long lineasProcesadas;
        private long equipajesInsertados;
        private long errores;
        private String errorMensaje;
        private Instant iniciadoEn;
        private Instant actualizadoEn;

        public String getTaskId() { return taskId; }
        public String getEstado() { return estado; }
        public String getArchivoActual() { return archivoActual; }
        public int getArchivosCompletados() { return archivosCompletados; }
        public int getArchivosTotal() { return archivosTotal; }
        public int getArchivosSaltados() { return archivosSaltados; }
        public long getLineasProcesadas() { return lineasProcesadas; }
        public long getEquipajesInsertados() { return equipajesInsertados; }
        public long getErrores() { return errores; }
        public String getErrorMensaje() { return errorMensaje; }
        public Instant getIniciadoEn() { return iniciadoEn; }
        public Instant getActualizadoEn() { return actualizadoEn; }
    }

    public CargaProgreso getProgreso(String taskId) {
        return progresos.get(taskId);
    }

    public String iniciarCargaAsync(boolean force) {
        String taskId = UUID.randomUUID().toString();
        CargaProgreso p = new CargaProgreso();
        p.taskId = taskId;
        p.estado = "INICIANDO";
        p.iniciadoEn = Instant.now();
        progresos.put(taskId, p);

        CompletableFuture.runAsync(() -> {
            try {
                cargarTodos(force, p);
            } catch (Exception e) {
                log.error("Carga async falló: {}", e.getMessage(), e);
                p.estado = "ERROR";
                p.errorMensaje = e.getMessage();
                p.actualizadoEn = Instant.now();
            }
        });

        return taskId;
    }

    private ResultadoCarga cargarTodos(boolean force, CargaProgreso p) {
        if (!force) {
            Integer existentes = jdbcTemplate.queryForObject("SELECT COUNT(1) FROM equipajes", Integer.class);
            if (existentes != null && existentes > 0) {
                log.info("Equipajes ya cargados ({} registros), omitiendo carga", existentes);
                return new ResultadoCarga(0, 0, 0);
            }
        } else {
            log.warn("Recarga forzada: truncando equipajes (CASCADE -> maletas, cola_planificacion)...");
            if (p != null) { p.estado = "TRUNCADO"; p.actualizadoEn = Instant.now(); }
            jdbcTemplate.execute("TRUNCATE TABLE equipajes CASCADE");
            log.warn("Tablas truncadas, iniciando recarga completa...");
        }

        File dir = new File(rutaArchivos);
        if (!dir.exists() || !dir.isDirectory()) {
            throw new CargaException("Directorio no encontrado: " + rutaArchivos);
        }

        File[] archivos = dir.listFiles((d, name) -> name.startsWith("_envios_") && name.endsWith(".txt"));
        if (archivos == null || archivos.length == 0) {
            throw new CargaException("No se encontraron archivos _envios_*.txt en " + rutaArchivos);
        }

        Map<String, NodoLogistico> nodosPorCodigo = new ConcurrentHashMap<>();
        nodoRepository.findAll().forEach(n -> nodosPorCodigo.put(n.getCodigoIata(), n));

        int totalEquipajes = 0;
        int totalLineas = 0;
        int errores = 0;

        if (p != null) {
            p.estado = "CARGANDO";
            p.archivosTotal = archivos.length;
            p.actualizadoEn = Instant.now();
        }

        for (File archivo : archivos) {
            Matcher matcher = FILE_PATTERN.matcher(archivo.getName());
            if (!matcher.matches()) continue;

            if (p != null) { p.archivoActual = archivo.getName(); p.actualizadoEn = Instant.now(); }

            String origenCodigo = matcher.group(1);
            NodoLogistico nodoOrigen = nodosPorCodigo.get(origenCodigo);
            if (nodoOrigen == null) {
                log.warn("Origen {} no encontrado en BD, saltando archivo {}", origenCodigo, archivo.getName());
                errores++;
                if (p != null) { p.archivosSaltados++; p.archivosCompletados++; p.actualizadoEn = Instant.now(); }
                continue;
            }

            log.info("Procesando {} (origen={})", archivo.getName(), origenCodigo);
            ResultadoArchivo result = procesarArchivo(archivo, nodoOrigen, nodosPorCodigo);
            totalEquipajes += result.equipajesInsertados;
            totalLineas += result.lineasProcesadas;
            errores += result.lineasError;

            if (p != null) {
                p.archivosCompletados++;
                p.lineasProcesadas += result.lineasProcesadas;
                p.equipajesInsertados += result.equipajesInsertados;
                p.errores += result.lineasError;
                p.actualizadoEn = Instant.now();
            }
        }

        if (p != null) {
            p.estado = "COMPLETADO";
            p.actualizadoEn = Instant.now();
        }

        return new ResultadoCarga(totalEquipajes, totalLineas, errores);
    }
}
