package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.shared.events.EquipajeIngresadoEvent;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class CargaMasivaService {

    private static final Logger log = LoggerFactory.getLogger(CargaMasivaService.class);

    private final EquipajeRepository equipajeRepository;
    private final PlanViajeRepository planViajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisCacheService redisCacheService;

    private final Map<UUID, List<RegistroPreview>> previewStore = new ConcurrentHashMap<>();

    public CargaMasivaService(EquipajeRepository equipajeRepository, PlanViajeRepository planViajeRepository,
                              SegmentoPlanRepository segmentoPlanRepository, VueloRepository vueloRepository,
                              NodoLogisticoRepository nodoRepository, ApplicationEventPublisher eventPublisher,
                              RedisCacheService redisCacheService) {
        this.equipajeRepository = equipajeRepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.eventPublisher = eventPublisher;
        this.redisCacheService = redisCacheService;
    }

    public record RegistroPreview(
            int fila,
            String idEquipaje,
            String destinoIata,
            UUID vueloId,
            OffsetDateTime slaComprometido,
            String estadoValidacion,
            String motivo
    ) {}

    public record PreviewResponse(
            int total,
            int validos,
            int conRevision,
            List<RegistroPreview> registros
    ) {}

    public record ConfirmarRequest(List<String> ids_equipaje) {}

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
            if (columnas.length < 4) {
                throw new CargaException("El CSV debe tener al menos 4 columnas: id_equipaje,destino_iata,vuelo_id,sla_comprometido");
            }

            NodoLogistico nodoOrigen = nodoRepository.findById(operadorNodoId)
                    .orElseThrow(() -> new CargaException("Nodo asignado al operador no encontrado"));

            String line;
            while ((line = reader.readLine()) != null) {
                filaNum++;
                line = line.trim();
                if (line.isBlank()) continue;

                String[] partes = parseCsvLine(line);
                if (partes.length < 4) {
                    registros.add(new RegistroPreview(filaNum, "", "", null, null, "REVISION",
                            "Fila mal formateada: se esperaban 4 columnas, se obtuvieron " + partes.length));
                    continue;
                }

                String idEquipaje = partes[0].trim();
                String destinoIata = partes[1].trim();
                String vueloIdStr = partes[2].trim();
                String slaStr = partes[3].trim();

                List<String> errores = new ArrayList<>();

                if (idEquipaje.isBlank()) {
                    errores.add("id_equipaje vacío");
                }

                if (destinoIata.isBlank()) {
                    errores.add("destino_iata vacío");
                } else if (nodoRepository.findByCodigoIata(destinoIata).isEmpty()) {
                    errores.add("Destino IATA " + destinoIata + " no existe en el sistema");
                }

                UUID vueloId = null;
                if (vueloIdStr.isBlank()) {
                    errores.add("vuelo_id vacío");
                } else {
                    try {
                        vueloId = UUID.fromString(vueloIdStr);
                    } catch (IllegalArgumentException e) {
                        errores.add("vuelo_id no es un UUID válido: " + vueloIdStr);
                    }
                }

                OffsetDateTime sla = null;
                if (slaStr.isBlank()) {
                    errores.add("sla_comprometido vacío");
                } else {
                    try {
                        sla = OffsetDateTime.parse(slaStr);
                    } catch (DateTimeParseException e) {
                        errores.add("sla_comprometido no es una fecha ISO 8601 válida: " + slaStr);
                    }
                }

                if (vueloId != null) {
                    Optional<Vuelo> vueloOpt = vueloRepository.findById(vueloId);
                    if (vueloOpt.isEmpty()) {
                        errores.add("Vuelo " + vueloIdStr + " no existe en el sistema");
                    } else {
                        Vuelo vuelo = vueloOpt.get();
                        if (vuelo.getEstado() != EstadoVuelo.PROGRAMADO) {
                            errores.add("El vuelo " + vuelo.getCodigoVuelo() + " no está PROGRAMADO");
                        }
                        if (vuelo.getCargaDisponible() <= 0) {
                            errores.add("Capacidad del vuelo " + vuelo.getCodigoVuelo() + " agotada");
                        }
                    }
                }

                if (nodoOrigen.getOcupacionActual() >= nodoOrigen.getCapacidadAlmacen()) {
                    errores.add("Capacidad del almacén superada en nodo " + nodoOrigen.getCodigoIata());
                }

                if (errores.isEmpty()) {
                    registros.add(new RegistroPreview(filaNum, idEquipaje, destinoIata, vueloId, sla, "VALIDO", null));
                } else {
                    registros.add(new RegistroPreview(filaNum, idEquipaje, destinoIata, vueloId, sla, "REVISION",
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
                .filter(r -> request.ids_equipaje().contains(r.idEquipaje()))
                .toList();

        NodoLogistico nodoOrigen = nodoRepository.findById(operadorNodoId)
                .orElseThrow(() -> new CargaException("Nodo asignado al operador no encontrado"));

        int ingresados = 0;
        int fallidos = 0;

        for (RegistroPreview preview : validos) {
            try {
                Vuelo vuelo = vueloRepository.findById(preview.vueloId())
                        .orElseThrow(() -> new RuntimeException("Vuelo no encontrado"));

                if (vuelo.getEstado() != EstadoVuelo.PROGRAMADO || vuelo.getCargaDisponible() <= 0) {
                    fallidos++;
                    continue;
                }

                if (nodoOrigen.getOcupacionActual() >= nodoOrigen.getCapacidadAlmacen()) {
                    fallidos++;
                    continue;
                }

                Equipaje equipaje = new Equipaje();
                equipaje.setId(UUID.randomUUID());
                equipaje.setIdExterno(preview.idEquipaje());
                equipaje.setDestinoIata(preview.destinoIata());
                equipaje.setSlaComprometido(preview.slaComprometido());
                equipaje.setFechaIngreso(OffsetDateTime.now());
                equipaje.setEstado(EstadoEquipaje.ENRUTADO);
                equipaje.setVueloActual(vuelo);
                equipajeRepository.save(equipaje);

                eventPublisher.publishEvent(new EquipajeIngresadoEvent(equipaje.getId(), OffsetDateTime.now()));

                PlanViaje planViaje = new PlanViaje();
                planViaje.setId(UUID.randomUUID());
                planViaje.setEquipaje(equipaje);
                planViaje.setEstadoSla(EstadoSla.EN_TIEMPO);
                planViaje.setTiempoEntregaEst(vuelo.getHoraLlegada());
                planViaje.setUbicacionTipo(UbicacionTipo.VUELO);
                planViaje.setUbicacionId(vuelo.getId());
                planViaje.setUbicacionLat(vuelo.getOrigenLat());
                planViaje.setUbicacionLon(vuelo.getOrigenLon());
                planViajeRepository.save(planViaje);

                SegmentoPlan segmento = new SegmentoPlan();
                segmento.setId(UUID.randomUUID());
                segmento.setPlanViaje(planViaje);
                segmento.setVuelo(vuelo);
                segmento.setNodoOrigen(vuelo.getOrigen());
                segmento.setNodoDestino(vuelo.getDestino());
                segmento.setOrden(1);
                segmento.setHoraSalidaProg(vuelo.getHoraSalida());
                segmento.setEstado(EstadoSegmento.PENDIENTE);
                segmentoPlanRepository.save(segmento);

                nodoOrigen.setOcupacionActual(nodoOrigen.getOcupacionActual() + 1);
                nodoRepository.save(nodoOrigen);

                vuelo.setCargaDisponible(vuelo.getCargaDisponible() - 1);
                vueloRepository.save(vuelo);

                redisCacheService.actualizarOcupacionNodo(nodoOrigen.getId(), nodoOrigen.getOcupacionActual());
                redisCacheService.actualizarCargaDisponibleVuelo(vuelo.getId(), vuelo.getCargaDisponible());

                ingresados++;
            } catch (Exception e) {
                log.error("Error al confirmar equipaje {}: {}", preview.idEquipaje(), e.getMessage(), e);
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
