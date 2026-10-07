package com.medisphere.auth;

import com.medisphere.audit.AuditService;
import com.medisphere.common.GlobalExceptionHandler.BadRequestException;
import com.medisphere.common.GlobalExceptionHandler.ConflictException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService, AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditService = auditService;
    }

    public record RegisterRequest(String name, String email, String password, Role role, String specialty) {}
    public record LoginRequest(String email, String password) {}
    public record AuthResponse(String accessToken, String refreshToken, String tokenType, UserDto user) {}
    public record UserDto(String id, String name, String email, String role, String specialty, String patientId) {}
    public record RefreshRequest(String refreshToken) {}
    public record ChangePasswordRequest(String oldPassword, String newPassword) {}

    public UserDto toDto(User u) {
        return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole().name(), u.getSpecialty(), u.getPatientId());
    }

    public AuthResponse register(RegisterRequest req) {
        if (req.email() == null || req.password() == null || req.password().length() < 8) {
            throw new BadRequestException("Valid email and a password of at least 8 characters are required");
        }
        if (userRepository.existsByEmail(req.email().toLowerCase()) || userRepository.existsByEmail(req.email())) {
            throw new ConflictException("Email already registered");
        }
        User u = new User();
        u.setName(req.name() == null || req.name().isBlank() ? "New User" : req.name());
        u.setEmail(req.email().toLowerCase());
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u.setRole(req.role() == null ? Role.PATIENT : req.role());
        u.setSpecialty(req.specialty());
        u = userRepository.save(u);
        auditService.log(u.getEmail(), u.getRole().name(), "USER_REGISTERED", "User", u.getId(), "SUCCESS", "New account created");
        return new AuthResponse(jwtService.generateAccessToken(u), jwtService.generateRefreshToken(u), "Bearer", toDto(u));
    }

    public AuthResponse login(LoginRequest req, String ip) {
        User u = userRepository.findByEmail(req.email() == null ? "" : req.email().toLowerCase())
                .orElseThrow(() -> {
                    auditService.log(String.valueOf(req.email()), "UNKNOWN", "LOGIN_FAILED", "User", req.email(), "FAILURE", "Unknown email");
                    return new BadRequestException("Invalid email or password");
                });
        if (!u.isActive() || !passwordEncoder.matches(req.password(), u.getPasswordHash())) {
            auditService.log(u.getEmail(), u.getRole().name(), "LOGIN_FAILED", "User", u.getId(), "FAILURE", "Bad credentials from " + ip);
            throw new BadRequestException("Invalid email or password");
        }
        auditService.log(u.getEmail(), u.getRole().name(), "LOGIN_SUCCESS", "User", u.getId(), "SUCCESS", "Login from " + ip);
        return new AuthResponse(jwtService.generateAccessToken(u), jwtService.generateRefreshToken(u), "Bearer", toDto(u));
    }

    public AuthResponse refresh(RefreshRequest req) {
        try {
            var claims = jwtService.parse(req.refreshToken());
            if (!"refresh".equals(claims.get("type", String.class))) throw new IllegalArgumentException("not refresh");
            User u = userRepository.findByEmail(claims.getSubject()).orElseThrow();
            return new AuthResponse(jwtService.generateAccessToken(u), jwtService.generateRefreshToken(u), "Bearer", toDto(u));
        } catch (Exception e) {
            throw new BadRequestException("Invalid or expired refresh token");
        }
    }

    public void changePassword(String email, ChangePasswordRequest req) {
        User u = userRepository.findByEmail(email).orElseThrow(() -> new BadRequestException("User not found"));
        if (!passwordEncoder.matches(req.oldPassword(), u.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (req.newPassword() == null || req.newPassword().length() < 8) {
            throw new BadRequestException("New password must be at least 8 characters");
        }
        u.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(u);
        auditService.log(email, u.getRole().name(), "PASSWORD_CHANGED", "User", u.getId(), "SUCCESS", "Password changed");
    }

    public Map<String, Object> me(String email) {
        User u = userRepository.findByEmail(email).orElseThrow(() -> new BadRequestException("User not found"));
        return Map.of("user", toDto(u));
    }
}
