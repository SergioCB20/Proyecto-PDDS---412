package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

public interface RoutingStrategy {

    RutaResult calcularRuta(
            NodoLogistico origen,
            NodoLogistico destino,
            OffsetDateTime slaComprometido,
            List<Vuelo> vuelosProgramados,
            int cantidad
    );

    default boolean soportaBatch() {
        return false;
    }

    default List<RutaResult> optimizarLote(
            List<ParametroRuta> parametros,
            List<Vuelo> vuelosProgramados,
            TiempoInterno tiempoSimulado
    ) {
        List<RutaResult> resultados = new ArrayList<>();
        for (ParametroRuta p : parametros) {
            RutaResult res = calcularRuta(p.origen(), p.destino(), p.slaComprometido(), vuelosProgramados, p.cantidad());
            resultados.add(res);
        }
        return resultados;
    }

    record ParametroRuta(NodoLogistico origen, NodoLogistico destino, OffsetDateTime slaComprometido, int cantidad) {}

}
