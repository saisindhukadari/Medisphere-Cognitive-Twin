package com.medisphere.fhir;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class FhirValidationService {
    private static final Set<String> SUPPORTED = Set.of("Patient", "Observation", "Condition", "MedicationRequest", "DiagnosticReport", "Encounter", "CarePlan");

    public List<String> validate(Map<String, Object> resource) {
        List<String> errors = new ArrayList<>();
        if (resource == null) { errors.add("Resource body is required"); return errors; }
        Object rt = resource.get("resourceType");
        if (rt == null || !SUPPORTED.contains(String.valueOf(rt))) {
            errors.add("Unsupported or missing resourceType (supported: " + SUPPORTED + ")");
        }
        if (resource.get("id") == null && resource.get("identifier") == null) {
            errors.add("Missing id or identifier");
        }
        if ("Patient".equals(String.valueOf(rt)) && resource.get("name") == null) {
            errors.add("Patient resource requires a name");
        }
        if ("Observation".equals(String.valueOf(rt)) && resource.get("code") == null) {
            errors.add("Observation resource requires a code");
        }
        return errors;
    }
}
