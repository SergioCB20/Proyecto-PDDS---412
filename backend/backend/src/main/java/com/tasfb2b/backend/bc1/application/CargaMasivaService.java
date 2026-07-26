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
import java.util.UUID;

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
            String idExterno,
            String fechaIngresoLocal,
            String destinoIata,
            int cantidad,
            String clienteId,
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
            throw new CargaException("El archivo está vacío");
        }

        List<RegistroPreview> registros = new ArrayList<>();
        int filaNum = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(archivo.getInputStream(), StandardCharsets.UTF_8))) {

            String line;
            while ((line = reader.readLine()) != null) {
                filaNum++;
                line = line.trim();
                if (line.isEmpty()) continue;

                // Formatos admitidos (campos separados por '-'):
                //   id-aaaammdd-hh-mm-dest-###-IdClien   (7 campos, hora y minuto sueltos)
                //   id-aaaammdd-hh:mm-dest-###-IdClien   (6 campos, hora como 'hh:mm')
                // Ej: 00000001-20260724-10-30-SCEL-180-0007729
                //     00000001-20260724-10:30-SCEL-180-0007729
                String[] parts = line.split("-");

                String idExterno, fechaStr, horaStr, minStr, destinoIata, cantidadStr, clienteId;
                if (parts.length >= 7) {
                    idExterno = parts[0];
                    fechaStr = parts[1];    // aaaammdd
                    horaStr = parts[2];     // hh
                    minStr = parts[3];      // mm
                    destinoIata = parts[4];
                    cantidadStr = parts[5];
                    clienteId = parts[6];
                } else if (parts.length == 6 && parts[2].contains(":")) {
                    String[] hm = parts[2].split(":");
                    idExterno = parts[0];
                    fechaStr = parts[1];    // aaaammdd
                    horaStr = hm[0];        // hh
                    minStr = hm.length > 1 ? hm[1] : "00"; // mm
                    destinoIata = parts[3];
                    cantidadStr = parts[4];
                    clienteId = parts[5];
                } else {
                    registros.add(new RegistroPreview(filaNum, "", "", "", 0, "", "REVISION",
                            "Formato inválido: se esperan campos separados por '-' " +
                            "(id-aaaammdd-hh-mm-dest-###-IdClien), con la hora como 'hh-mm' o 'hh:mm'"));
                    continue;
                }

                List<String> errores = new ArrayList<>();

                // Validar destino
                if (destinoIata.isBlank() || nodoRepository.findByCodigoIata(destinoIata).isEmpty()) {
                    errores.add("Destino IATA no existe: " + destinoIata);
                }

                // Validar cantidad
                int cantidad = 0;
                try {
                    cantidad = Integer.parseInt(cantidadStr);
                    if (cantidad < 1) errores.add("Cantidad debe ser >= 1");
                } catch (NumberFormatException e) {
                    errores.add("Cantidad no es un número: " + cantidadStr);
                }

                // Validar clienteId
                String clienteIdRegex = "^[A-Z]?\\d{6,12}$";
                if (clienteId == null || !clienteId.matches(clienteIdRegex)) {
                    errores.add("clienteId inválido: " + (clienteId != null ? clienteId : "vacio") + ". Formato esperado: [A-Z]?\\d{6,12}");
                }

                // Validar fecha
                String fechaIngresoLocal = "";
                try {
                    if (fechaStr.length() == 8) {
                        String yyyy = fechaStr.substring(0, 4);
                        String mm = fechaStr.substring(4, 6);
                        String dd = fechaStr.substring(6, 8);
                        fechaIngresoLocal = String.format("%s-%s-%s %s:%s", yyyy, mm, dd, horaStr, minStr);
                    }
                } catch (Exception e) {
                    errores.add("Fecha/hora inválida: " + fechaStr + " " + horaStr + ":" + minStr);
                }

                if (errores.isEmpty()) {
                    registros.add(new RegistroPreview(filaNum, idExterno, fechaIngresoLocal, destinoIata, cantidad, clienteId, "VALIDO", null));
                } else {
                    registros.add(new RegistroPreview(filaNum, idExterno, fechaIngresoLocal, destinoIata, cantidad, clienteId, "REVISION",
                            String.join("; ", errores)));
                }
            }

        } catch (CargaException e) {
            throw e;
        } catch (Exception e) {
            throw new CargaException("Error al procesar el archivo: " + e.getMessage());
        }

        if (filaNum == 0) {
            throw new CargaException("El archivo no contiene datos");
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
                equipaje.setIdExterno(preview.idExterno());
                equipaje.setOrigenIata(nodoOrigen.getCodigoIata());
                equipaje.setDestinoIata(preview.destinoIata());
                equipaje.setCantidad(preview.cantidad());
                equipaje.setSlaComprometido(sla);
                equipaje.setFechaIngreso(OffsetDateTime.now());
                equipaje.setFechaIngresoLocal(preview.fechaIngresoLocal());
                equipaje.setEstado(EstadoEquipaje.REGISTRADO);
                equipaje.setVueloActual(null);
                equipaje.setTag(com.tasfb2b.backend.bc1.domain.TagsOperacion.TAG_DIA_A_DIA);
                equipaje.setClienteId(preview.clienteId());
                equipajeRepository.save(equipaje);

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

    public static class CargaException extends RuntimeException {
        public CargaException(String msg) { super(msg); }
    }
}