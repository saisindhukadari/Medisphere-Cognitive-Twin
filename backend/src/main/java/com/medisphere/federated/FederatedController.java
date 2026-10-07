package com.medisphere.federated;

import com.medisphere.common.GlobalExceptionHandler.NotFoundException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
public class FederatedController {
    private final FlModelRepository repository;

    public FederatedController(FlModelRepository repository) { this.repository = repository; }

    @GetMapping("/api/models")
    public List<FlModel> models() { return repository.findAll(); }

    @PostMapping("/api/models/{id}/activate")
    public FlModel activate(@PathVariable String id) {
        FlModel m = repository.findById(id).orElseThrow(() -> new NotFoundException("Model not found"));
        m.setStatus("ACTIVE");
        m.setUpdatedAt(Instant.now());
        return repository.save(m);
    }

    @PostMapping("/api/models/{id}/deactivate")
    public FlModel deactivate(@PathVariable String id) {
        FlModel m = repository.findById(id).orElseThrow(() -> new NotFoundException("Model not found"));
        m.setStatus("INACTIVE");
        m.setUpdatedAt(Instant.now());
        return repository.save(m);
    }

    @GetMapping("/api/federated-learning")
    public Map<String, Object> status() {
        return Map.of(
                "nodes", List.of(
                        Map.of("name", "Hospital A", "status", "TRAINED", "localAccuracy", 0.87, "localLoss", 0.31),
                        Map.of("name", "Hospital B", "status", "TRAINED", "localAccuracy", 0.84, "localLoss", 0.35),
                        Map.of("name", "Hospital C", "status", "TRAINING", "localAccuracy", 0.79, "localLoss", 0.42),
                        Map.of("name", "Hospital D", "status", "TRAINED", "localAccuracy", 0.86, "localLoss", 0.33)),
                "globalModelVersion", "cardio-fl-v1.4.2-demo",
                "federatedRound", 42,
                "globalAccuracy", 0.855,
                "globalLoss", 0.34,
                "convergence", "CONVERGING",
                "dataLeavesInstitution", false,
                "disclaimer", "Federated aggregation across participating institution nodes; production deployments require additional privacy (e.g. secure aggregation, differential privacy) and legal review.");
    }
}
