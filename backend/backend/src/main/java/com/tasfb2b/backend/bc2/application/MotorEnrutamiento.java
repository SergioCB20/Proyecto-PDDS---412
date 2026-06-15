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
        if (equipajes.isEmpty()) return List.of();

        List<RoutingStrategy.ParametroRuta> params = new ArrayList<>();
        for (Equipaje e : equipajes) {
            String origenIata = e.getOrigenIata();
            if (origenIata == null) continue;

            NodoLogistico origen = nodoRepository.findByCodigoIata(origenIata).orElse(null);
            if (origen == null) continue;

            NodoLogistico destino = nodoRepository.findByCodigoIata(e.getDestinoIata()).orElse(null);
            if (destino == null) continue;

            params.add(new RoutingStrategy.ParametroRuta(
                    origen, destino, e.getSlaComprometido()));
        }

        if (params.isEmpty()) return List.of();

        return batchStrategy.optimizarLote(params, programados, horaVirtual);
    }

}
