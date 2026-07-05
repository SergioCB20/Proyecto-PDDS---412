package com.tasfb2b.backend.shared.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class RedisCacheService {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheService.class);

    private final StringRedisTemplate redisTemplate;

    public RedisCacheService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void actualizarOcupacionNodo(UUID nodoId, int ocupacion) {
        try {
            redisTemplate.opsForValue().set("nodo:" + nodoId + ":ocupacion", String.valueOf(ocupacion));
        } catch (Exception e) {
            log.warn("Redis no disponible en actualizarOcupacionNodo({}): {}", nodoId, e.getMessage());
        }
    }

    public void actualizarCargaDisponibleVuelo(UUID vueloId, int cargaDisponible) {
        try {
            redisTemplate.opsForValue().set("vuelo:" + vueloId + ":carga_disponible", String.valueOf(cargaDisponible));
        } catch (Exception e) {
            log.warn("Redis no disponible en actualizarCargaDisponibleVuelo({}): {}", vueloId, e.getMessage());
        }
    }

    public Integer getOcupacionNodo(UUID nodoId) {
        try {
            String val = redisTemplate.opsForValue().get("nodo:" + nodoId + ":ocupacion");
            return val != null ? Integer.parseInt(val) : null;
        } catch (Exception e) {
            log.warn("Redis no disponible en getOcupacionNodo({}): {}", nodoId, e.getMessage());
            return null;
        }
    }

    public Integer getCargaDisponibleVuelo(UUID vueloId) {
        try {
            String val = redisTemplate.opsForValue().get("vuelo:" + vueloId + ":carga_disponible");
            return val != null ? Integer.parseInt(val) : null;
        } catch (Exception e) {
            log.warn("Redis no disponible en getCargaDisponibleVuelo({}): {}", vueloId, e.getMessage());
            return null;
        }
    }

    public void setMetricasSesion(UUID sesionId, String json) {
        try {
            redisTemplate.opsForValue().set("sesion:" + sesionId + ":metricas", json);
        } catch (Exception e) {
            log.warn("Redis no disponible en setMetricasSesion({}): {}", sesionId, e.getMessage());
        }
    }

    public String getMetricasSesion(UUID sesionId) {
        try {
            return redisTemplate.opsForValue().get("sesion:" + sesionId + ":metricas");
        } catch (Exception e) {
            log.warn("Redis no disponible en getMetricasSesion({}): {}", sesionId, e.getMessage());
            return null;
        }
    }

    public void delMetricasSesion(UUID sesionId) {
        try {
            redisTemplate.delete("sesion:" + sesionId + ":metricas");
        } catch (Exception e) {
            log.warn("Redis no disponible en delMetricasSesion({}): {}", sesionId, e.getMessage());
        }
    }

    public void setEstadoSesion(UUID sesionId, String estado) {
        try {
            redisTemplate.opsForValue().set("sesion:" + sesionId + ":estado", estado);
        } catch (Exception e) {
            log.warn("Redis no disponible en setEstadoSesion({}): {}", sesionId, e.getMessage());
        }
    }

    public String getEstadoSesion(UUID sesionId) {
        try {
            return redisTemplate.opsForValue().get("sesion:" + sesionId + ":estado");
        } catch (Exception e) {
            log.warn("Redis no disponible en getEstadoSesion({}): {}", sesionId, e.getMessage());
            return null;
        }
    }

    public void eliminarMetricasSesion(UUID sesionId) {
        try {
            redisTemplate.delete("sesion:" + sesionId + ":metricas");
            redisTemplate.delete("sesion:" + sesionId + ":estado");
        } catch (Exception e) {
            log.warn("Redis no disponible en eliminarMetricasSesion({}): {}", sesionId, e.getMessage());
        }
    }

    public void set(String key, String value, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(key, value, java.time.Duration.ofSeconds(ttlSeconds));
        } catch (Exception e) {
            log.warn("Redis no disponible en set({}): {}", key, e.getMessage());
        }
    }

    public String get(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.warn("Redis no disponible en get({}): {}", key, e.getMessage());
            return null;
        }
    }
}
