package com.tasfb2b.backend.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class BackPrefixFilter extends OncePerRequestFilter {

    private static final String BACK_PREFIX = "/back";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (BACK_PREFIX.equals(request.getContextPath())) {
            chain.doFilter(request, response);
            return;
        }

        String uri = request.getRequestURI();
        if (!uri.startsWith(BACK_PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override
            public String getRequestURI() {
                return super.getRequestURI().substring(BACK_PREFIX.length());
            }

            @Override
            public String getServletPath() {
                String sp = super.getServletPath();
                if (sp.startsWith(BACK_PREFIX)) {
                    return sp.substring(BACK_PREFIX.length());
                }
                return sp;
            }

            @Override
            public StringBuffer getRequestURL() {
                StringBuffer url = super.getRequestURL();
                int idx = url.indexOf(BACK_PREFIX);
                if (idx >= 0) {
                    return new StringBuffer(url.substring(0, idx) + url.substring(idx + BACK_PREFIX.length()));
                }
                return url;
            }
        }, response);
    }
}
