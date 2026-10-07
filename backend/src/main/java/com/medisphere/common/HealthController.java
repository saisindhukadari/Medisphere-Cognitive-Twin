package com.medisphere.common;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Unauthenticated liveness/readiness probe used by development tooling and the
 * docker-compose health check. Deliberately exposes no secrets, no configuration
 * values and no data — only status flags.
 */
@RestController
public class HealthController {
    private final MongoTemplate mongoTemplate;

    public HealthController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        boolean dbUp = false;
        try {
            mongoTemplate.getDb().runCommand(new org.bson.Document("ping", 1));
            dbUp = true;
        } catch (Exception ex) {
            dbUp = false;
        }
        body.put("status", "UP");
        body.put("database", dbUp ? "CONNECTED" : "UNAVAILABLE");
        body.put("application", "medisphere-backend");
        body.put("mode", "synthetic-demo");
        body.put("timestamp", Instant.now().toString());
        return body;
    }
}
