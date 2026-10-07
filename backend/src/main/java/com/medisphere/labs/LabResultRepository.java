package com.medisphere.labs;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LabResultRepository extends MongoRepository<LabResult, String> {
    List<LabResult> findByPatientIdOrderByCollectedAtDesc(String patientId);
}
