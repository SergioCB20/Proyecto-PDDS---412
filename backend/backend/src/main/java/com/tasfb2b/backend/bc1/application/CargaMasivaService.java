package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.shared.events.EquipajeIngresadoEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class CargaMasivaService {

    private static final Logger log = LoggerFactory.getLogger(CargaMasivaService.class);

    private final EquipajeRepository equipajeRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final ColaPlanificacionRepository colaRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final EquipajeService equipajeService;
    private final OcupacionNodoService ocupacionNodoService;

    private final Map<UUID, List<RegistroPreview>> previewStore = new ConcurrentHashMap<>();

    public CargaMasivaService(EquipajeRepository equipajeRepository,
                              NodoLogisticoRepository nodoRepository,
                              ColaPlanificacionRepository colaRepository,
                              ApplicationEventPublisher eventPublisher,
                              EquipajeService equipajeService,
                              OcupacionNodoService ocupacionNodoService) {
        this.equipajeRepository = equipajeRepository;
        this.nodoRepository = nodoRepository;
        this.colaRepository = colaRepository;
        this.eventPublisher = eventPublisher;
        this.equipajeService = equipajeService;
        this.ocupacionNodoService = ocupacionNodoService;
    }

    public record RegistroPreview(
            int fila,
            String destinoIata,
            int cantidad,
            String estadoValidacion,
            String motivo
    ) {}

    public record PreviewResponse(
            int total,
            int validos,
            int conRevision,
            List<RegistroPreview> registros
    ) {}

    public record ConfirmarRequest() {}

    public record ConfirmarResponse(int ingresados, int fallidos) {}

    public PreviewResponse procesarCsv(MultipartFile archivo, UUID operadorNodoId) {
        if (archivo.isEmpty()) {
            throw new CargaException("El archivo CSV está vacío");
        }

        List<RegistroPreview> registros = new ArrayList<>();
        int filaNum = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(archivo.getInputStream(), StandardCharsets.UTF_8))) {

            String header = reader.readLine();
            if (header == null || header.isBlank()) {
                throw new CargaException("El archivo CSV no tiene cabecera");
            }

            String[] columnas = header.split(",");
            if (columnas.length < 2) {
                throw new CargaException("El CSV debe tener al menos 2 columnas: destino_iata,cantidad");
            }

            NodoLogistico nodoOrigen = nodoRepository.findById(operadorNodoId)
                    .orElseThrow(() -> new CargaException("Nodo asignado al operador no encontrado"));

            String line;
            while ((line = reader.readLine()) != null) {
                filaNum++;
                line = line.trim();
                if (line.isBlank()) continue;

                String[] partes = parseCsvLine(line);
                if (partes.length < 2) {
                    registros.add(new RegistroPreview(filaNum, "", 0, "REVISION",
                            "Fila mal formateada: se esperaban 2 columnas, se obtuvieron " + partes.length));
                    continue;
                }

                String destinoIata = partes[0].trim();
                String cantidadStr = partes[1].trim();

                List<String> errores = new ArrayList<>();

                if (destinoIata.isBlank()) {
                    errores.add("destino_iata vacío");
                } else if (nodoRepository.findByCodigoIata(destinoIata).isEmpty()) {
                    errores.add("Destino IATA " + destinoIata + " no existe en el sistema");
                }

                int cantidad = 0;
                try {
                    cantidad = Integer.parseInt(cantidadStr);
                    if (cantidad < 1) {
                        errores.add("cantidad debe ser al menos 1");
                    }
                } catch (NumberFormatException e) {
                    errores.add("cantidad no es un número válido: " + cantidadStr);
                }

                if (ocupacionNodoService.leer(nodoOrigen.getId(), OcupacionNodoService.OPERACION)
                        >= (nodoOrigen.getCapacidadAlmacen() != null ? nodoOrigen.getCapacidadAlmacen() : 0)) {
                    errores.add("Capacidad del almacén superada en nodo " + nodoOrigen.getCodigoIata());
                }

                if (errores.isEmpty()) {
                    registros.add(new RegistroPreview(filaNum, destinoIata, cantidad, "VALIDO", null));
                } else {
                    registros.add(new RegistroPreview(filaNum, destinoIata, cantidad, "REVISION",
                            String.join("; ", errores)));
                }
            }

        } catch (CargaException e) {
            throw e;
        } catch (Exception e) {
            throw new CargaException("Error al procesar el archivo CSV: " + e.getMessage());
        }

        if (filaNum == 0) {
            throw new CargaException("El archivo CSV no contiene datos (solo cabecera)");
        }

        int validos = (int) registros.stream().filter(r -> "VALIDO".equals(r.estadoValidacion())).count();
        int conRevision = registros.size() - validos;

        previewStore.put(operadorNodoId, registros);

        return new PreviewResponse(registros.size(), validos, conRevision, registros);
    }

    @Transactional
    public ConfirmarResponse confirmar(ConfirmarRequest request, UUID operadorNodoId) {
        List<RegistroPreview> registros = previewStore.get(operadorNodoId);
        if (registros == null) {
            throw new CargaException("No hay preview disponible. Ejecute carga-masiva primero.");
        }

        List<RegistroPreview> validos = registros.stream()
                .filter(r -> "VALIDO".equals(r.estadoValidacion()))
                .toList();

        NodoLogistico nodoOrigen = nodoRepository.findById(operadorNodoId)
                .orElseThrow(() -> new CargaException("Nodo asignado al operador no encontrado"));

        int ingresados = 0;
        int fallidos = 0;

        for (RegistroPreview preview : validos) {
            try {
                if (ocupacionNodoService.leer(nodoOrigen.getId(), OcupacionNodoService.OPERACION)
                        >= (nodoOrigen.getCapacidadAlmacen() != null ? nodoOrigen.getCapacidadAlmacen() : 0)) {
                    fallidos++;
                    continue;
                }

                NodoLogistico nodoDestino = nodoRepository.findByCodigoIata(preview.destinoIata()).orElse(null);
                if (nodoDestino == null) {
                    fallidos++;
                    continue;
                }

                OffsetDateTime sla = OffsetDateTime.now().plusHours(
                        nodoOrigen.getContinente() != null
                                && nodoOrigen.getContinente().equals(nodoDestino.getContinente()) ? 24 : 48);

                Equipaje equipaje = new Equipaje();
                equipaje.setId(UUID.randomUUID());
                equipaje.setIdExterno("ENV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                equipaje.setOrigenIata(nodoOrigen.getCodigoIata());
                equipaje.setDestinoIata(preview.destinoIata());
                equipaje.setCantidad(preview.cantidad());
                equipaje.setSlaComprometido(sla);
                equipaje.setFechaIngreso(OffsetDateTime.now());
                equipaje.setEstado(EstadoEquipaje.REGISTRADO);
                equipaje.setVueloActual(null);
                equipajeRepository.save(equipaje);

                // Cada equipaje genera N maletas hijas con codigo_maleta unico.
                equipajeService.generarMaletasPara(equipaje);

                eventPublisher.publishEvent(new EquipajeIngresadoEvent(equipaje.getId(), OffsetDateTime.now()));

                ColaPlanificacion colaItem = new ColaPlanificacion();
                colaItem.setId(UUID.randomUUID());
                colaItem.setEquipajeId(equipaje.getId());
                colaItem.setTipo(TipoCola.PLANIFICACION);
                colaItem.setEstado(EstadoCola.PENDIENTE);
                colaItem.setIntentos(0);
                colaItem.setFechaCreacion(OffsetDateTime.now());
                colaItem.setSlaComprometido(sla);
                colaRepository.save(colaItem);

                ingresados++;
            } catch (Exception e) {
                log.error("Error al confirmar equipaje fila {}: {}", preview.fila(), e.getMessage(), e);
                fallidos++;
            }
        }

        previewStore.remove(operadorNodoId);

        return new ConfirmarResponse(ingresados, fallidos);
    }

    private String[] parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        result.add(current.toString());

        return result.toArray(new String[0]);
    }

    public static class CargaException extends RuntimeException {
        public CargaException(String msg) { super(msg); }
    }
}
