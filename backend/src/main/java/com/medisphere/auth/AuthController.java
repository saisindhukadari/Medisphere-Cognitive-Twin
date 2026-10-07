package com.medisphere.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final com.medisphere.audit.AuditService auditService;

    public AuthController(AuthService authService, com.medisphere.audit.AuditService auditService) {
        this.authService = authService;
        this.auditService = auditService;
    }

    public record RegisterBody(@NotBlank String name, @Email @NotBlank String email, @NotBlank String password, Role role, String specialty) {}
    public record LoginBody(@Email @NotBlank String email, @NotBlank String password) {}

    @PostMapping("/register")
    public AuthService.AuthResponse register(@Valid @RequestBody RegisterBody body) {
        return authService.register(new AuthService.RegisterRequest(body.name(), body.email(), body.password(), body.role(), body.specialty()));
    }

    @PostMapping("/login")
    public AuthService.AuthResponse login(@Valid @RequestBody LoginBody body, HttpServletRequest request) {
        return authService.login(new AuthService.LoginRequest(body.email(), body.password()), CurrentUser.ip(request));
    }

    @PostMapping("/refresh")
    public AuthService.AuthResponse refresh(@RequestBody AuthService.RefreshRequest req) {
        return authService.refresh(req);
    }

    @GetMapping("/me")
    public Object me() {
        return authService.me(CurrentUser.email());
    }

    @PostMapping("/change-password")
    public void changePassword(@RequestBody AuthService.ChangePasswordRequest req) {
        authService.changePassword(CurrentUser.email(), req);
    }

    @PostMapping("/logout")
    public void logout() {
        // JWT is stateless; client discards tokens. Audit the event.
        auditService.log(CurrentUser.email(), CurrentUser.role(), "LOGOUT", "User", "", "SUCCESS", "User logged out");
    }
}
