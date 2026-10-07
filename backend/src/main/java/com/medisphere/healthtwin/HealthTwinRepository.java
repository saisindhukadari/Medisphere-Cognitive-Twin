package com.medisphere.healthtwin;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface HealthTwinRepository extends MongoRepository<HealthTwin, String> {
    Optional<HealthTwin> findByPatientId(String patientId);
}
