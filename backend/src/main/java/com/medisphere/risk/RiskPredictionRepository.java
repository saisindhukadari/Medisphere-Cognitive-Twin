package com.medisphere.risk;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RiskPredictionRepository extends MongoRepository<RiskPrediction, String> {
    List<RiskPrediction> findByPatientIdOrderByPredictedAtDesc(String patientId);
    List<RiskPrediction> findTop50ByOrderByPredictedAtDesc();
    Optional<RiskPrediction> findFirstByPatientIdOrderByPredictedAtDesc(String patientId);
}
