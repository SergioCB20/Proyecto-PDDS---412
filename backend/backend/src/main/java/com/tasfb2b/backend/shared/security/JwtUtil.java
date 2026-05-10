package com.tasfb2b.backend.shared.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generarToken(UUID usuarioId, String correo, String rol, UUID nodoRefId) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(expirationMs);

        return Jwts.builder()
                .subject(usuarioId.toString())
                .claim("correo", correo)
                .claim("rol", rol)
                .claim("nodo_ref_id", nodoRefId != null ? nodoRefId.toString() : null)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(secretKey)
                .compact();
    }

    public Claims extraerClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean esTokenValido(String token) {
        try {
            extraerClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String extraerCorreo(String token) {
        return extraerClaims(token).get("correo", String.class);
    }

    public String extraerRol(String token) {
        return extraerClaims(token).get("rol", String.class);
    }

    public UUID extraerUsuarioId(String token) {
        String id = extraerClaims(token).getSubject();
        return UUID.fromString(id);
    }

    public UUID extraerNodoRefId(String token) {
        String nodoRefId = extraerClaims(token).get("nodo_ref_id", String.class);
        return nodoRefId != null ? UUID.fromString(nodoRefId) : null;
    }
}