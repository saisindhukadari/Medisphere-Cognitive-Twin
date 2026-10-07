package com.medisphere.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
    private final SecretKey key;
    private final long accessExpMs;
    private final long refreshExpMs;

    public JwtService(@Value("${medisphere.jwt.secret}") String secret,
                      @Value("${medisphere.jwt.access-expiration-ms}") long accessExpMs,
                      @Value("${medisphere.jwt.refresh-expiration-ms}") long refreshExpMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpMs = accessExpMs;
        this.refreshExpMs = refreshExpMs;
    }

    public String generateAccessToken(User user) {
        return Jwts.builder()
                .subject(user.getEmail())
                .claims(Map.of("uid", user.getId() == null ? "" : user.getId(), "role", user.getRole().name(), "name", user.getName() == null ? "" : user.getName()))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessExpMs))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(User user) {
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("type", "refresh")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpMs))
                .signWith(key)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
