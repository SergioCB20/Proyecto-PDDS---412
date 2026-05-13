package com.tasfb2b.backend.shared.infrastructure;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class RedisCacheService {

    private final StringRedisTemplate redisTemplate;

    public RedisCacheService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void actualizarOcupacionNodo(UUID nodoId, int ocupacion) {
        redisTemplate.opsForValue().set("nodo:" + nodoId + ":ocupacion", String.valueOf(ocupacion));
    }

    public void actualizarCargaDisponibleVuelo(UUID vueloId, int cargaDisponible) {
        redisTemplate.opsForValue().set("vuelo:" + vueloId + ":carga_disponible", String.valueOf(cargaDisponible));
    }

    public Integer getOcupacionNodo(UUID nodoId) {
        String val = redisTemplate.opsForValue().get("nodo:" + nodoId + ":ocupacion");
        return val != null ? Integer.parseInt(val) : null;
    }

    public Integer getCargaDisponibleVuelo(UUID vueloId) {
        String val = redisTemplate.opsForValue().get("vuelo:" + vueloId + ":carga_disponible");
        return val != null ? Integer.parseInt(val) : null;
    }

    public void eliminarMetricasSesion(UUID sesionId) {
        redisTemplate.delete("sesion:" + sesionId + ":metricas");
        redisTemplate.delete("sesion:" + sesionId + ":estado");
    }
}
