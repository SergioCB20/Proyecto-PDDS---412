package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.PlanVuelos;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.PlanVuelosRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class OperacionPreparacionService {

    private static final String TAG_DIA_A_DIA = "tag_dia_a_dia";

    private final NodoLogisticoRepository nodoRepository;
    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final PlanVuelosRepository planVuelosRepository;
    private PlanVuelos planOperativo;

    public OperacionPreparacionService(NodoLogisticoRepository nodoRepository,
                                        VueloRepository vueloRepository,
                                        EquipajeRepository equipajeRepository,
                                        PlanVuelosRepository planVuelosRepository) {
        this.nodoRepository = nodoRepository;
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.planVuelosRepository = planVuelosRepository;
    }

    private PlanVuelos getPlanOperativo() {
        if (planOperativo == null) {
            planOperativo = planVuelosRepository.findFirstByOrderByVigenciaDesdeAsc()
                .orElseThrow(() -> new IllegalStateException("No existe PlanVuelos base. Verificar seeds"));
        }
        return planOperativo;
    }

    @Transactional
    public Map<String, Object> preparar(MultipartFile archivoPlanes, Integer horaPresentacion) {
        setCapacidades999();
        int planesCargados = parseAndSavePlanes(archivoPlanes, horaPresentacion);
        int equipajesEliminados = equipajeRepository.deleteByTag(TAG_DIA_A_DIA);

        return Map.of(
            "capacidades", "999",
            "planes_cargados", planesCargados,
            "equipajes_limpiados", equipajesEliminados,
            "tag", TAG_DIA_A_DIA
        );
    }

    @Transactional
    public Map<String, Object> restaurar() {
        restoreCapacidades();
        int vuelosEliminados = vueloRepository.deleteByTag(TAG_DIA_A_DIA);
        int equipajesEliminados = equipajeRepository.deleteByTag(TAG_DIA_A_DIA);

        return Map.of(
            "capacidades", "originales",
            "vuelos_eliminados", vuelosEliminados,
            "equipajes_eliminados", equipajesEliminados,
            "tag", TAG_DIA_A_DIA
        );
    }

    public Map<String, Object> estado() {
        List<NodoLogistico> nodos = nodoRepository.findAllByOrderByCodigoIataAsc();
        long planesTag = vueloRepository.findByTag(TAG_DIA_A_DIA).size();
        long equipajesTag = equipajeRepository.findByTag(TAG_DIA_A_DIA).size();

        Map<String, Integer> caps = new HashMap<>();
        for (NodoLogistico n : nodos) {
            caps.put(n.getCodigoIata(), n.getCapacidadAlmacen());
        }

        return Map.of(
            "capacidades", caps,
            "planes_tag_count", planesTag,
            "equipajes_tag_count", equipajesTag,
            "tag", TAG_DIA_A_DIA
        );
    }

    private void setCapacidades999() {
        List<String> iatas = List.of("SPIM", "SABE", "EKCH", "VIDP");
        for (String iata : iatas) {
            nodoRepository.findByCodigoIata(iata).ifPresent(n -> {
                n.setCapacidadAlmacen(999);
                nodoRepository.save(n);
            });
        }
    }

    private void restoreCapacidades() {
        Map<String, Integer> originales = Map.of(
            "SPIM", 440,
            "SABE", 460,
            "EKCH", 480,
            "VIDP", 480
        );
        for (Map.Entry<String, Integer> e : originales.entrySet()) {
            nodoRepository.findByCodigoIata(e.getKey()).ifPresent(n -> {
                n.setCapacidadAlmacen(e.getValue());
                nodoRepository.save(n);
            });
        }
    }

    private int parseAndSavePlanes(MultipartFile archivo, Integer horaPresentacion) {
        if (archivo == null || archivo.isEmpty()) return 0;

        int count = 0;
        LocalDate hoy = LocalDate.now();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(archivo.getInputStream(), StandardCharsets.UTF_8))) {

            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("**")) continue;

                String[] parts = line.split("-");
                if (parts.length < 5) continue;

                String origenIata = parts[0];
                String destinoIata = parts[1];
                String hoMo = parts[2];
                String hdMd = parts[3];
                int capacidad = Integer.parseInt(parts[4]);

                int ho = horaPresentacion != null ? horaPresentacion : 12;
                int mo = 0;
                int hd = ho;
                int md = 0;

                if (hoMo.contains(":")) {
                    String[] hm = hoMo.split(":");
                    ho = Integer.parseInt(hm[0]);
                    mo = Integer.parseInt(hm[1]);
                }
                if (hdMd.contains(":")) {
                    String[] hm = hdMd.split(":");
                    hd = Integer.parseInt(hm[0]);
                    md = Integer.parseInt(hm[1]);
                }

                NodoLogistico origen = nodoRepository.findByCodigoIata(origenIata).orElse(null);
                NodoLogistico destino = nodoRepository.findByCodigoIata(destinoIata).orElse(null);
                if (origen == null || destino == null) continue;

                OffsetDateTime horaSalida = hoy.atTime(ho, mo).atOffset(ZoneOffset.UTC);
                OffsetDateTime horaLlegada = hoy.atTime(hd, md).atOffset(ZoneOffset.UTC);
                if (hd < ho) horaLlegada = horaLlegada.plusDays(1);

                Vuelo vuelo = new Vuelo();
                vuelo.setId(UUID.randomUUID());
                vuelo.setCodigoVuelo(generateCodigo(origenIata, destinoIata));
                vuelo.setEstado(com.tasfb2b.backend.bc1.domain.EstadoVuelo.PROGRAMADO);
                vuelo.setPlanVuelos(getPlanOperativo());
                vuelo.setOrigen(origen);
                vuelo.setDestino(destino);
                vuelo.setOrigenLat(origen.getLatitud());
                vuelo.setOrigenLon(origen.getLongitud());
                vuelo.setDestinoLat(destino.getLatitud());
                vuelo.setDestinoLon(destino.getLongitud());
                vuelo.setCapacidadCarga(capacidad);
                vuelo.setCargaDisponible(capacidad);
                vuelo.setHoraSalida(horaSalida);
                vuelo.setHoraLlegada(horaLlegada);
                vuelo.setEsPlantilla(false);
                vuelo.setFechaOperacion(hoy);
                vuelo.setTag(TAG_DIA_A_DIA);

                vueloRepository.save(vuelo);
                count++;
            }
        } catch (Exception e) {
            throw new RuntimeException("Error parsing flight plans: " + e.getMessage(), e);
        }

        return count;
    }

    private String generateCodigo(String origen, String destino) {
        return origen.substring(0, 2).toUpperCase() + destino.substring(0, 2).toUpperCase()
            + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
    }
}
