package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.annotation.JsonProperty;

public record EnvioEntregadoResponse(
    @JsonProperty("origen_iata") String origenIata,
    @JsonProperty("destino_iata") String destinoIata,
    @JsonProperty("codigo_vuelo") String codigoVuelo,
    Integer cantidad
) {}
