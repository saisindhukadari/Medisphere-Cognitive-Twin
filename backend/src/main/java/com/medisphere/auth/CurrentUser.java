package com.medisphere.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {
    private CurrentUser() {}

    public static String email() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() ? String.valueOf(auth.getPrincipal()) : "anonymous";
    }

    public static String role() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "anonymous";
        return auth.getAuthorities().stream().findFirst().map(a -> a.getAuthority().replace("ROLE_", "")).orElse("anonymous");
    }

    public static String ip(HttpServletRequest request) {
        return request != null ? request.getRemoteAddr() : "unknown";
    }
}
