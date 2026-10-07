package com.medisphere.fhir;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface FhirResourceRepository extends MongoRepository<FhirResourceEntity, String> {
    List<FhirResourceEntity> findByPatientId(String patientId);
    long countByValidationStatus(String validationStatus);
}
