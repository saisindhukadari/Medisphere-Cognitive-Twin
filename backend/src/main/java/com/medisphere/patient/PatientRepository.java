package com.medisphere.patient;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PatientRepository extends MongoRepository<Patient, String> {
    Page<Patient> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(String a, String b, Pageable pageable);
    long countByRiskStatus(String riskStatus);
}
