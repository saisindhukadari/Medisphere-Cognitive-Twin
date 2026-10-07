package com.medisphere.provider;

import com.medisphere.common.GlobalExceptionHandler.NotFoundException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/providers")
public class ProviderController {
    private final ProviderRepository repository;

    public ProviderController(ProviderRepository repository) { this.repository = repository; }

    @GetMapping
    public List<Provider> list() { return repository.findAll(); }

    @GetMapping("/{id}")
    public Provider get(@PathVariable String id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Provider not found"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public Provider create(@RequestBody Provider p) { return repository.save(p); }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public Provider update(@PathVariable String id, @RequestBody Provider p) {
        Provider existing = repository.findById(id).orElseThrow(() -> new NotFoundException("Provider not found"));
        p.setId(existing.getId());
        return repository.save(p);
    }
}
