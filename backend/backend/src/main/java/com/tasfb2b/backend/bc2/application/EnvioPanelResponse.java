package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record EnvioPanelResponse(
    @JsonProperty("equipaje_id") UUID equipajeId,
    @JsonProperty("origen_iata") String origenIata,
    @JsonProperty("destino_iata") String destinoIata,
    @JsonProperty("codigo_vuelo") String codigoVuelo,
    String estado,
    Integer cantidad
) {}
