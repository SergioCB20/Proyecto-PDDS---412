package com.tasfb2b.backend.shared.security;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth ->
                auth
                    .requestMatchers("/health", "/api/auth/**", "/api/ws/telemetria/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/nodos/**")
                    .authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/vuelos/**")
                    .authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/vuelos/**")
                    .hasRole("OPERADOR_LOGISTICO")
                    .requestMatchers(HttpMethod.PUT, "/api/vuelos/**")
                    .hasRole("OPERADOR_LOGISTICO")
                    .requestMatchers(HttpMethod.DELETE, "/api/vuelos/**")
                    .hasRole("OPERADOR_LOGISTICO")
                    .requestMatchers("/api/usuarios/**")
                    .hasRole("ADMINISTRADOR")
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMINISTRADOR")
                    .requestMatchers("/api/equipajes/**")
                    .hasRole("OPERADOR_LOGISTICO")
                    .requestMatchers("/api/sesiones/**")
                    .hasRole("ANALISTA")
                    .requestMatchers("/api/manifiestos/**")
                    .hasRole("OPERADOR_LOGISTICO")
                    .requestMatchers("/api/eventos/**")
                    .authenticated()
                    .anyRequest()
                    .authenticated()
            )
            .addFilterBefore(
                jwtFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(
            List.of(
                "http://localhost:3000",
                "http://localhost:5000",
                "http://127.0.0.1:3000",
                "https://1inf54-983-4d.inf.pucp.edu.pe"
            )
        );
        config.setAllowedMethods(
            List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        );
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
            new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
