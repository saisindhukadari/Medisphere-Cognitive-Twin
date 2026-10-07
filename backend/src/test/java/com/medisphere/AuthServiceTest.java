package com.medisphere;

import com.medisphere.auth.AuthService;
import com.medisphere.auth.JwtService;
import com.medisphere.auth.Role;
import com.medisphere.auth.User;
import com.medisphere.auth.UserRepository;
import com.medisphere.audit.AuditService;
import com.medisphere.common.GlobalExceptionHandler.BadRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock AuditService auditService;
    @InjectMocks AuthService authService;

    @Test
    void registerRejectsShortPassword() {
        assertThrows(BadRequestException.class, () ->
                authService.register(new AuthService.RegisterRequest("X", "x@y.com", "short", Role.PATIENT, null)));
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmail("x@y.com")).thenReturn(true);
        assertThrows(Exception.class, () ->
                authService.register(new AuthService.RegisterRequest("X", "x@y.com", "longenough1", Role.PATIENT, null)));
    }

    @Test
    void loginFailsOnBadCredentials() {
        User u = new User();
        u.setEmail("x@y.com");
        u.setPasswordHash("hash");
        u.setRole(Role.PATIENT);
        u.setActive(true);
        when(userRepository.findByEmail("x@y.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);
        assertThrows(BadRequestException.class, () ->
                authService.login(new AuthService.LoginRequest("x@y.com", "wrong"), "127.0.0.1"));
    }

    @Test
    void loginSucceedsWithValidCredentials() {
        User u = new User();
        u.setEmail("x@y.com");
        u.setPasswordHash("hash");
        u.setRole(Role.PROVIDER);
        u.setActive(true);
        when(userRepository.findByEmail("x@y.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("pw12345678", "hash")).thenReturn(true);
        when(jwtService.generateAccessToken(any())).thenReturn("access");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh");
        var res = authService.login(new AuthService.LoginRequest("x@y.com", "pw12345678"), "127.0.0.1");
        assertEquals("access", res.accessToken());
        verify(auditService).log(eq("x@y.com"), eq("PROVIDER"), eq("LOGIN_SUCCESS"), any(), any(), eq("SUCCESS"), any());
    }
}
