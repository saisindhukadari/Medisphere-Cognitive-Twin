package com.medisphere.consent;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ConsentRepository extends MongoRepository<Consent, String> {
    List<Consent> findByPatientId(String patientId);
}
