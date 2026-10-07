package com.medisphere;

import com.medisphere.fhir.FhirValidationService;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class FhirValidationServiceTest {
    private final FhirValidationService svc = new FhirValidationService();

    @Test
    void validPatient() {
        assertTrue(svc.validate(Map.of("resourceType", "Patient", "id", "p1", "name", java.util.List.of())).isEmpty());
    }

    @Test
    void invalidResourceType() {
        assertFalse(svc.validate(Map.of("resourceType", "Banana", "id", "1")).isEmpty());
    }

    @Test
    void missingIdAndIdentifier() {
        assertFalse(svc.validate(Map.of("resourceType", "Patient", "name", java.util.List.of())).isEmpty());
    }

    @Test
    void observationRequiresCode() {
        assertFalse(svc.validate(Map.of("resourceType", "Observation", "id", "o1")).isEmpty());
    }
}
