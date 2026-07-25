package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MotorEnrutamiento {

    private static final Logger log = LoggerFactory.getLogger(MotorEnrutamiento.class);

    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final RoutingStrategy defaultStrategy;
    private final RoutingStrategy batchStrategy;
    private final boolean preferGreedy;

    @Autowired
    public MotorEnrutamiento(VueloRepository vueloRepository,
                             NodoLogisticoRepository nodoRepository,
                             @Qualifier("greedyRoutingStrategy") RoutingStrategy defaultStrategy,
                             @Qualifier("acoRoutingStrategy") RoutingStrategy batchStrategy,
                             @Value("${app.simulacion.prefer-greedy:true}") boolean preferGreedy) {
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.defaultStrategy = defaultStrategy;
        this.batchStrategy = batchStrategy;
        // FIX #14: por defecto Greedy es ~50x mas rapido que ACO por equipo y produce
        // rutas validas en mallos bien conectados (origen->destino directo o 1 escala).
        // ACO solo aporta valor si hay muchas escalas posibles (>2) donde feromonas
        // ayudan; aqui no es el caso. Cuando ACO falla, igual ya tenemos fallback.
        this.preferGreedy = preferGreedy;
    }

    public RutaResult calcularRuta(NodoLogistico origen, String destinoIata, OffsetDateTime slaComprometido) {
        NodoLogistico destino = nodoRepository.findByCodigoIata(destinoIata)
                .orElse(null);
        if (destino == null) {
            return RutaResult.sinRuta("Destino IATA no encontrado: " + destinoIata);
        }

        List<Vuelo> programados = vueloRepository.findByEstadoAndEsPlantilla(EstadoVuelo.PROGRAMADO, false, Pageable.unpaged())
                .getContent();

        return defaultStrategy.calcularRuta(origen, destino, slaComprometido, programados);
    }

    public List<RutaResult> calcularRutasLote(List<Equipaje> equipajes) {
        List<Vuelo> programados = vueloRepository.findByEstadoAndEsPlantilla(EstadoVuelo.PROGRAMADO, false, Pageable.unpaged())
                .getContent();
        return calcularRutasLote(equipajes, programados, null);
    }

    public List<RutaResult> calcularRutasLote(List<Equipaje> equipajes, List<Vuelo> programados) {
        return calcularRutasLote(equipajes, programados, null);
    }

    public List<RutaResult> calcularRutasLote(List<Equipaje> equipajes, List<Vuelo> programados,
                                               OffsetDateTime horaVirtual) {
        return calcularRutasLote(equipajes, programados, horaVirtual, null);
    }

    public List<RutaResult> calcularRutasLote(List<Equipaje> equipajes, List<Vuelo> programados,
                                               OffsetDateTime horaVirtual,
                                               Map<String, NodoLogistico> nodosPorIata) {
        if (equipajes.isEmpty()) return List.of();

        List<RoutingStrategy.ParametroRuta> params = new ArrayList<>();
        for (Equipaje e : equipajes) {
            String origenIata = e.getOrigenIata();
            if (origenIata == null) continue;

            NodoLogistico origen = nodosPorIata != null
                    ? nodosPorIata.get(origenIata)
                    : nodoRepository.findByCodigoIata(origenIata).orElse(null);
            if (origen == null) continue;

            NodoLogistico destino = nodosPorIata != null
                    ? nodosPorIata.get(e.getDestinoIata())
                    : nodoRepository.findByCodigoIata(e.getDestinoIata()).orElse(null);
            if (destino == null) continue;

            params.add(new RoutingStrategy.ParametroRuta(
                    origen, destino, e.getSlaComprometido(),
                    e.getCantidad() != null ? e.getCantidad() : 1));
        }

        if (params.isEmpty()) return List.of();

        // FIX #15: precomputar indice espacial sobre vuelosProgramados UNA vez.
        // Antes, cada eq reescaneaba los 11263 vuelos con stream().filter() 5 veces.
        // Esto llevaba 107/200 exitos en 16s. Con indice Map<UUID, List<Vuelo>> por origen
        // y destino, baja a <1s/batch.
        GreedyRoutingStrategy.VuelosIndex idx = GreedyRoutingStrategy.VuelosIndex.from(programados);

        // FIX #14 por defecto: Greedy. ~50x mas rapido, mismo resultado en mallos bien
        // conectados. ACO sigue disponible via FIX #7b si greedy falla.
        List<RutaResult> resultados = new ArrayList<>(params.size());
        if (preferGreedy) {
            long tGreedy = System.nanoTime();
            int greedyOk = 0;
            for (RoutingStrategy.ParametroRuta p : params) {
                // FIX #15: usar ruta indexada para evitar O(N) por equipaje.
                // Cast seguro: preferGreedy=true implica defaultStrategy = GreedyRoutingStrategy
                // (configurado en el Qualifier de arriba).
                if (defaultStrategy instanceof GreedyRoutingStrategy g) {
                    RutaResult r = g.calcularRutaIndexado(
                            p.origen(), p.destino(), p.slaComprometido(), idx);
                    if (r.exitoso()) greedyOk++;
                    resultados.add(r);
                } else {
                    RutaResult r = defaultStrategy.calcularRuta(
                            p.origen(), p.destino(), p.slaComprometido(), programados);
                    if (r.exitoso()) greedyOk++;
                    resultados.add(r);
                }
            }
            long msGreedy = (System.nanoTime() - tGreedy) / 1_000_000;
            log.info("FIX #15 Greedy indexado: {}/{} exitos en {}ms (idx vivos={}, batch {} eq)",
                    greedyOk, params.size(), msGreedy, idx.totalVivos(), params.size());

            // Si Greedy solo resuelve <50% de los equipos, intentar ACO para los que quedaron
            // sin ruta. ACO es optimo para mallos complejos (multi-escala) pero es lento.
            if (greedyOk < params.size() / 2) {
                List<RoutingStrategy.ParametroRuta> restantes = new ArrayList<>();
                for (int i = 0; i < params.size(); i++) {
                    if (!resultados.get(i).exitoso()) restantes.add(params.get(i));
                }
                if (!restantes.isEmpty()) {
                    long tACO = System.nanoTime();
                    List<RutaResult> acoResults = batchStrategy.optimizarLote(restantes, programados, horaVirtual);
                    long msACO = (System.nanoTime() - tACO) / 1_000_000;
                    log.info("FIX #15 ACO fallback: {}/{} exitos en {}ms",
                            acoResults.stream().filter(RutaResult::exitoso).count(),
                            restantes.size(), msACO);
                    int j = 0;
                    for (int i = 0; i < resultados.size(); i++) {
                        if (!resultados.get(i).exitoso() && j < acoResults.size()) {
                            resultados.set(i, acoResults.get(j++));
                        }
                    }
                }
            }
        } else {
            resultados = batchStrategy.optimizarLote(params, programados, horaVirtual);
            long exitos = resultados.stream().filter(RutaResult::exitoso).count();
            if (exitos == 0 && !params.isEmpty()) {
                log.warn("ACO no encontro ruta para {} equipajes. Fallback a Greedy.", params.size());
                resultados = new ArrayList<>(params.size());
                for (RoutingStrategy.ParametroRuta p : params) {
                    resultados.add(defaultStrategy.calcularRuta(
                            p.origen(), p.destino(), p.slaComprometido(),
                            programados));
                }
            }
        }
        return resultados;
    }

}
