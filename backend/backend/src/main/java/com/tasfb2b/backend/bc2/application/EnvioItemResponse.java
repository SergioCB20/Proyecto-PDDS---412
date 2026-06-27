package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record EnvioItemResponse(
    UUID id,
    @JsonProperty("origen_iata") String origenIata,
    @JsonProperty("destino_iata") String destinoIata,
    @JsonProperty("codigo_equipaje") String codigoEquipaje,
    Integer cantidad
) {}
