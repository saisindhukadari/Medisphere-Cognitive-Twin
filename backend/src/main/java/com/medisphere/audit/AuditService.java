package com.medisphere.audit;

import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuditService {
    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) { this.repository = repository; }

    public AuditLog log(String user, String role, String action, String resource, String resourceId, String result, String details) {
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setRole(role);
        log.setAction(action);
        log.setResource(resource);
        log.setResourceId(resourceId);
        log.setResult(result);
        log.setDetails(details);
        log.setTimestamp(Instant.now());
        return repository.save(log);
    }
}
