package com.medisphere.auth;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) { this.userRepository = userRepository; }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<AuthService.UserDto> list() {
        return userRepository.findAll().stream().map(u -> new AuthService.UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole().name(), u.getSpecialty(), u.getPatientId())).toList();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public Map<String, Object> setStatus(@PathVariable String id, @RequestBody Map<String, Boolean> body) {
        User u = userRepository.findById(id).orElseThrow();
        u.setActive(body.getOrDefault("active", true));
        userRepository.save(u);
        return Map.of("id", id, "active", u.isActive());
    }
}
