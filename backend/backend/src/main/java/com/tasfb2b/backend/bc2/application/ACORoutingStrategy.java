package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.*;

@Component
@Qualifier("acoRoutingStrategy")
public class ACORoutingStrategy implements RoutingStrategy {

    private static final double ALPHA = 1.0;
    private static final double BETA = 2.5;
    private static final double RHO = 0.20;
    private static final double Q = 1_000_000.0;
    private static final double ELITE_FACTOR = 3.0;
    private static final double TAU_MIN = 0.1;
    private static final double TAU_MAX = 10.0;
    private static final double PENALIDAD_SLA_POR_HORA = 2_000.0;
    private static final double PENALIDAD_INVALIDA = 50_000.0;
    private static final double BONUS_MALETA_ACEPTADA = 100_000.0;
    private static final double COSTO_ESPERA_POR_HORA = 10.0;
    private static final double COSTO_VUELO_POR_HORA = 5.0;
    private static final int MAX_ITERACIONES = 10;
    private static final int NUM_HORMIGAS = 5;
    private static final int MAX_ESCALAS_BUSQUEDA = 6;

    private Map<String, Map<String, ArcoVueloInterno>> grafo;
    private Map<String, Integer> capacidadVuelos;
    private Map<String, Integer> capacidadAlmacen;
    private Map<String, Double> feromonas;
    private Map<String, Boolean> cacheAlcanzable;
    private final Random random = new Random();

    @Override
    public boolean soportaBatch() {
        return true;
    }

    @Override
    public RutaResult calcularRuta(NodoLogistico origen, NodoLogistico destino,
                                   OffsetDateTime slaComprometido, List<Vuelo> vuelosProgramados) {
        List<ParametroRuta> params = List.of(new ParametroRuta(origen, destino, slaComprometido));
        List<RutaResult> resultados = optimizarLote(params, vuelosProgramados, null);
        return resultados.isEmpty() ? RutaResult.sinRuta("Error en ACO") : resultados.get(0);
    }

    @Override
    public List<RutaResult> optimizarLote(List<ParametroRuta> parametros,
                                          List<Vuelo> vuelosProgramados,
                                          TiempoInterno tiempoSimulado) {
        construirGrafo(vuelosProgramados);
        inicializarFeromonas();

        List<MaletaInterna> maletas = new ArrayList<>();
        int idx = 0;
        for (ParametroRuta p : parametros) {
            maletas.add(new MaletaInterna(
                    "maleta-" + idx,
                    p.origen().getId().toString(),
                    p.destino().getId().toString(),
                    p.origen().getCodigoIata(),
                    p.destino().getCodigoIata(),
                    0, 1,
                    calcularTiempoMaximo(p.slaComprometido())
            ));
            idx++;
        }

        List<ResultadoInterno> mejorSolucionGlobal = null;
        double mejorCostoGlobal = Double.MAX_VALUE;

        for (int iter = 0; iter < MAX_ITERACIONES; iter++) {
            cacheAlcanzable.clear();
            List<ResultadoInterno> mejorSolucionIter = null;
            double mejorCostoIter = Double.MAX_VALUE;

            for (int h = 0; h < NUM_HORMIGAS; h++) {
                Map<String, Integer> capVueloLocal = new HashMap<>();
                Map<String, int[]> capAeroTemporal = new HashMap<>();
                List<ResultadoInterno> solucion = new ArrayList<>();
                double costo = 0;

                List<MaletaInterna> ordenadas = new ArrayList<>(maletas);
                ordenadas.sort(Comparator.comparingInt(MaletaInterna::tiempoMaximo)
                        .thenComparingInt(MaletaInterna::horaSolicitud));

                for (MaletaInterna m : ordenadas) {
                    ResultadoInterno res = construirRuta(m, capVueloLocal, capAeroTemporal);
                    solucion.add(res);
                    if (res.exitosa) {
                        costo += res.costo - BONUS_MALETA_ACEPTADA;
                        for (int j = 0; j < res.ruta.size(); j++) {
                            String vId = res.ruta.get(j).id;
                            capVueloLocal.merge(vId, m.cantidad, Integer::sum);
                            if (j < res.ruta.size() - 1) {
                                int hEntrada = res.ruta.get(j).horaLlegada;
                                int hSalida = res.ruta.get(j + 1).horaSalida;
                                if (hSalida < hEntrada) hSalida += 48;
                                int[] timeline = capAeroTemporal.computeIfAbsent(res.ruta.get(j).destinoId, k -> new int[48]);
                                for (int t = hEntrada; t < hSalida; t++) {
                                    timeline[t % 48] += m.cantidad;
                                }
                            }
                        }
                    } else {
                        costo += PENALIDAD_INVALIDA;
                    }
                }

                if (costo < mejorCostoIter) {
                    mejorCostoIter = costo;
                    mejorSolucionIter = new ArrayList<>(solucion);
                }
                if (costo < mejorCostoGlobal) {
                    mejorCostoGlobal = costo;
                    mejorSolucionGlobal = new ArrayList<>(solucion);
                }
            }

            evaporarFeromonas();
            if (mejorSolucionIter != null) {
                depositarFeromonas(mejorSolucionIter, mejorCostoIter, 1.0);
            }
            if (mejorSolucionGlobal != null && mejorCostoGlobal < mejorCostoIter) {
                depositarFeromonas(mejorSolucionGlobal, mejorCostoGlobal, ELITE_FACTOR);
            }
        }

        Map<String, ResultadoInterno> porId = new HashMap<>();
        if (mejorSolucionGlobal != null) {
            for (ResultadoInterno r : mejorSolucionGlobal) {
                porId.put(r.maletaId, r);
            }
        }

        List<RutaResult> resultados = new ArrayList<>();
        for (MaletaInterna m : maletas) {
            ResultadoInterno res = porId.get(m.id);
            if (res != null && res.exitosa && !res.ruta.isEmpty()) {
                List<SegmentoInfo> segmentos = new ArrayList<>();
                int orden = 1;
                for (ArcoVueloInterno a : res.ruta) {
                    segmentos.add(new SegmentoInfo(orden++, UUID.fromString(a.id),
                            a.codigoVuelo, UUID.fromString(a.origenId), a.origenIata,
                            UUID.fromString(a.destinoId), a.destinoIata,
                            a.horaSalidaDt(), a.horaLlegadaDt()));
                }
                resultados.add(new RutaResult(segmentos, true, null));
            } else {
                resultados.add(RutaResult.sinRuta("ACO no encontró ruta para " + m.id));
            }
        }
        return resultados;
    }

    private void construirGrafo(List<Vuelo> vuelos) {
        grafo = new HashMap<>();
        capacidadVuelos = new HashMap<>();
        capacidadAlmacen = new HashMap<>();

        for (Vuelo v : vuelos) {
            String origenId = v.getOrigen().getId().toString();
            String destinoId = v.getDestino().getId().toString();

            grafo.computeIfAbsent(origenId, k -> new HashMap<>()).put(v.getId().toString(),
                    new ArcoVueloInterno(v.getId().toString(), v.getCodigoVuelo(),
                            origenId, v.getOrigen().getCodigoIata(),
                            destinoId, v.getDestino().getCodigoIata(),
                            v.getHoraSalida().getHour(), v.getHoraLlegada().getHour(),
                            calcularDuracion(v), v.getCargaDisponible(),
                            v.getHoraSalida(), v.getHoraLlegada()));

            capacidadVuelos.putIfAbsent(v.getId().toString(), v.getCargaDisponible());
            capacidadAlmacen.putIfAbsent(origenId, v.getOrigen().getCapacidadAlmacen());
            capacidadAlmacen.putIfAbsent(destinoId, v.getDestino().getCapacidadAlmacen());
        }
    }

    private int calcularDuracion(Vuelo v) {
        return (int) java.time.Duration.between(v.getHoraSalida(), v.getHoraLlegada()).toHours();
    }

    private void inicializarFeromonas() {
        feromonas = new HashMap<>();
        cacheAlcanzable = new HashMap<>();
        for (Map<String, ArcoVueloInterno> destinos : grafo.values()) {
            for (String vId : destinos.keySet()) {
                feromonas.put(vId, 1.0);
            }
        }
    }

    private int calcularTiempoMaximo(OffsetDateTime sla) {
        long horas = java.time.Duration.between(OffsetDateTime.now(), sla).toHours();
        return Math.max(1, (int) horas);
    }

    private ResultadoInterno construirRuta(MaletaInterna maleta,
                                            Map<String, Integer> capVuelo,
                                            Map<String, int[]> capAeroTemporal) {
        if (maleta.origenId.equals(maleta.destinoId)) {
            return new ResultadoInterno(maleta.id, List.of(), 0, true);
        }

        String actualId = maleta.origenId;
        int horaActual = maleta.horaSolicitud;
        int presupuesto = maleta.tiempoMaximo;
        int tiempoUsado = 0;
        List<ArcoVueloInterno> ruta = new ArrayList<>();
        Set<String> visitados = new HashSet<>();
        visitados.add(actualId);

        while (!actualId.equals(maleta.destinoId)) {
            List<ArcoVueloInterno> candidatos = new ArrayList<>();
            Map<String, ArcoVueloInterno> desde = grafo.get(actualId);
            if (desde == null) break;

            for (ArcoVueloInterno v : desde.values()) {
                int esperaV = v.horaSalida - horaActual;
                if (esperaV < 0) esperaV += 24;
                if (esperaV < 1 || esperaV > 24) continue;

                int horaLlegadaV = v.horaLlegada;
                if (horaLlegadaV < v.horaSalida) horaLlegadaV += 24;
                int tiempoSegmento = esperaV + v.duracionHoras;
                if (tiempoUsado + tiempoSegmento > presupuesto + 6) continue;
                if (capVuelo.getOrDefault(v.id, 0) + maleta.cantidad > v.capacidad) continue;
                if (visitados.contains(v.destinoId)) continue;

                if (!v.destinoId.equals(maleta.destinoId)) {
                    int maxAero = capacidadAlmacen.getOrDefault(v.destinoId, 100);
                    int[] timeline = capAeroTemporal.get(v.destinoId);
                    if (timeline != null) {
                        int hLlegadaV = v.horaLlegada;
                        if (hLlegadaV < v.horaSalida) hLlegadaV += 24;
                        if (timeline[hLlegadaV % 48] + maleta.cantidad > maxAero) continue;
                    }
                    if (!esAlcanzable(v.destinoId, maleta.destinoId, horaLlegadaV + 1, ruta.size() + 1))
                        continue;
                }
                candidatos.add(v);
            }

            if (candidatos.isEmpty()) break;

            ArcoVueloInterno elegido = seleccionarVuelo(candidatos, maleta.destinoId, horaActual, capVuelo, maleta.cantidad);
            ruta.add(elegido);
            visitados.add(elegido.destinoId);

            int horaLlegada = elegido.horaLlegada;
            if (horaLlegada < elegido.horaSalida) horaLlegada += 24;
            int espera = elegido.horaSalida - horaActual;
            if (espera < 0) espera += 24;
            tiempoUsado += espera + elegido.duracionHoras;
            horaActual = horaLlegada + 1;
            actualId = elegido.destinoId;
        }

        if (actualId.equals(maleta.destinoId) && !ruta.isEmpty()) {
            double costo = evaluarRuta(maleta, ruta, capVuelo, capAeroTemporal);
            return new ResultadoInterno(maleta.id, ruta, costo, true);
        }
        return new ResultadoInterno(maleta.id, List.of(), PENALIDAD_INVALIDA, false);
    }

    private ArcoVueloInterno seleccionarVuelo(List<ArcoVueloInterno> candidatos, String destinoFinal,
                                               int horaActual, Map<String, Integer> capVuelo, int cantidad) {
        double[] pesos = new double[candidatos.size()];
        double suma = 0;
        for (int i = 0; i < candidatos.size(); i++) {
            ArcoVueloInterno v = candidatos.get(i);
            double tau = Math.min(TAU_MAX, feromonas.getOrDefault(v.id, 1.0));
            int espera = v.horaSalida - horaActual;
            if (espera < 0) espera += 24;
            double ocupacion = (double) (capVuelo.getOrDefault(v.id, 0) + cantidad) / v.capacidad;
            double factorCapacidad = Math.max(0.1, 1.0 - ocupacion);
            double eta = factorCapacidad / (1.0 + espera + v.duracionHoras);
            if (v.destinoId.equals(destinoFinal)) eta *= 50.0;
            pesos[i] = Math.pow(tau, ALPHA) * Math.pow(eta, BETA);
            suma += pesos[i];
        }
        if (suma == 0) return candidatos.get(random.nextInt(candidatos.size()));
        double umbral = random.nextDouble() * suma;
        double acumulado = 0;
        for (int i = 0; i < candidatos.size(); i++) {
            acumulado += pesos[i];
            if (acumulado >= umbral) return candidatos.get(i);
        }
        return candidatos.get(candidatos.size() - 1);
    }

    private boolean esAlcanzable(String origen, String destino, int horaMin, int escalasYaUsadas) {
        if (origen.equals(destino)) return true;
        int escalasRestantes = MAX_ESCALAS_BUSQUEDA - escalasYaUsadas;
        if (escalasRestantes <= 0) return false;

        int horaBloque = (horaMin / 2) * 2;
        String key = origen + "->" + destino + "@" + horaBloque + ":" + escalasRestantes;
        Boolean cached = cacheAlcanzable.get(key);
        if (cached != null) return cached;

        Queue<String[]> cola = new LinkedList<>();
        cola.add(new String[]{origen, String.valueOf(horaMin), "0"});
        Set<String> visitados = new HashSet<>();
        visitados.add(origen + ":" + horaBloque);
        boolean alcanzable = false;

        while (!cola.isEmpty() && !alcanzable) {
            String[] nodo = cola.poll();
            String aeroActual = nodo[0];
            int horaAct = Integer.parseInt(nodo[1]);
            int escalas = Integer.parseInt(nodo[2]);
            if (escalas >= escalasRestantes) continue;

            Map<String, ArcoVueloInterno> desde = grafo.get(aeroActual);
            if (desde == null) continue;

            for (ArcoVueloInterno v : desde.values()) {
                int espera = v.horaSalida - horaAct;
                if (espera < 0) espera += 24;
                if (espera > 24) continue;
                if (v.destinoId.equals(destino)) { alcanzable = true; break; }
                int horaLlegada = v.horaLlegada;
                if (horaLlegada < v.horaSalida) horaLlegada += 24;
                String visitKey = v.destinoId + ":" + ((horaLlegada / 2) * 2);
                if (!visitados.contains(visitKey)) {
                    visitados.add(visitKey);
                    cola.add(new String[]{v.destinoId, String.valueOf(horaLlegada + 1), String.valueOf(escalas + 1)});
                }
            }
        }

        cacheAlcanzable.put(key, alcanzable);
        return alcanzable;
    }

    private void evaporarFeromonas() {
        feromonas.replaceAll((id, tau) -> Math.max(TAU_MIN, tau * (1.0 - RHO)));
    }

    private void depositarFeromonas(List<ResultadoInterno> soluciones, double costoSolucion, double factor) {
        if (costoSolucion <= 0 || soluciones.isEmpty()) return;
        double deposito = factor * Q / costoSolucion;
        for (ResultadoInterno res : soluciones) {
            if (!res.exitosa) continue;
            for (ArcoVueloInterno v : res.ruta) {
                double nueva = Math.min(TAU_MAX, feromonas.getOrDefault(v.id, 1.0) + deposito);
                feromonas.put(v.id, nueva);
            }
        }
    }

    private double evaluarRuta(MaletaInterna maleta, List<ArcoVueloInterno> ruta,
                                Map<String, Integer> capVuelo, Map<String, int[]> capAeroTemporal) {
        if (ruta.isEmpty()) return PENALIDAD_INVALIDA;
        double costo = 0;
        int tiempoAcumulado = 0;
        int horaAnterior = maleta.horaSolicitud;

        for (int i = 0; i < ruta.size(); i++) {
            ArcoVueloInterno v = ruta.get(i);
            int espera = v.horaSalida - horaAnterior;
            if (espera < 0) espera += 24;
            costo += espera * COSTO_ESPERA_POR_HORA + v.duracionHoras * COSTO_VUELO_POR_HORA;
            tiempoAcumulado += espera + v.duracionHoras;

            int horaLlegada = v.horaLlegada;
            if (horaLlegada < v.horaSalida) horaLlegada += 24;
            horaAnterior = horaLlegada;

            if (!v.destinoId.equals(maleta.destinoId) && i < ruta.size() - 1) {
                ArcoVueloInterno vSig = ruta.get(i + 1);
                int hEntrada = v.horaLlegada;
                int hSalida = vSig.horaSalida;
                if (hSalida < hEntrada) hSalida += 24;
                int maxAero = capacidadAlmacen.getOrDefault(v.destinoId, 100);
                int[] timeline = capAeroTemporal.get(v.destinoId);
                if (timeline != null) {
                    for (int t = hEntrada; t < hSalida; t++) {
                        if (timeline[t % 48] + maleta.cantidad > maxAero) {
                            costo += 50_000.0; break;
                        }
                    }
                }
            }

            double ocupacionVuelo = (double) (capVuelo.getOrDefault(v.id, 0) + maleta.cantidad) / v.capacidad;
            costo += Math.pow(ocupacionVuelo, 4) * 20000.0;
        }

        if (tiempoAcumulado > maleta.tiempoMaximo) {
            costo += PENALIDAD_SLA_POR_HORA * (tiempoAcumulado - maleta.tiempoMaximo);
        }
        return costo;
    }

    private record ArcoVueloInterno(String id, String codigoVuelo,
                                     String origenId, String origenIata,
                                     String destinoId, String destinoIata,
                                     int horaSalida, int horaLlegada,
                                     int duracionHoras, int capacidad,
                                     OffsetDateTime horaSalidaDt, OffsetDateTime horaLlegadaDt) {}

    private record MaletaInterna(String id, String origenId, String destinoId,
                                  String origenIata, String destinoIata,
                                  int horaSolicitud, int cantidad, int tiempoMaximo) {}

    private record ResultadoInterno(String maletaId, List<ArcoVueloInterno> ruta,
                                     double costo, boolean exitosa) {}
}
