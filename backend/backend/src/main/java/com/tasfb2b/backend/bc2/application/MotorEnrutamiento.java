package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class MotorEnrutamiento {

    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final RoutingStrategy defaultStrategy;
    private final RoutingStrategy batchStrategy;

    @Autowired
    public MotorEnrutamiento(VueloRepository vueloRepository,
                             NodoLogisticoRepository nodoRepository,
                             @Qualifier("greedyRoutingStrategy") RoutingStrategy defaultStrategy,
                             @Qualifier("acoRoutingStrategy") RoutingStrategy batchStrategy) {
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.defaultStrategy = defaultStrategy;
        this.batchStrategy = batchStrategy;
    }

    public RutaResult calcularRuta(NodoLogistico origen, String destinoIata, OffsetDateTime slaComprometido) {
        NodoLogistico destino = nodoRepository.findByCodigoIata(destinoIata)
                .orElse(null);
        if (destino == null) {
            return RutaResult.sinRuta("Destino IATA no encontrado: " + destinoIata);
        }

        List<Vuelo> programados = vueloRepository.findByEstado(EstadoVuelo.PROGRAMADO, Pageable.unpaged())
                .getContent();

        return defaultStrategy.calcularRuta(origen, destino, slaComprometido, programados);
    }

    public List<RutaResult> calcularRutasLote(List<Equipaje> equipajes) {
        if (equipajes.isEmpty()) return List.of();

        List<Vuelo> programados = vueloRepository.findByEstado(EstadoVuelo.PROGRAMADO, Pageable.unpaged())
                .getContent();

        List<RoutingStrategy.ParametroRuta> params = new ArrayList<>();
        for (Equipaje e : equipajes) {
            Vuelo vueloActual = e.getVueloActual();
            if (vueloActual == null || vueloActual.getOrigen() == null) continue;

            NodoLogistico destino = nodoRepository.findByCodigoIata(e.getDestinoIata()).orElse(null);
            if (destino == null) continue;

            params.add(new RoutingStrategy.ParametroRuta(
                    vueloActual.getOrigen(), destino, e.getSlaComprometido()));
        }

        if (params.isEmpty()) return List.of();

        TiempoInterno tiempoSimulado = TiempoInterno.desde(
                OffsetDateTime.now(),
                equipajes.get(0).getFechaIngreso());

        return batchStrategy.optimizarLote(params, programados, tiempoSimulado);
    }

}
