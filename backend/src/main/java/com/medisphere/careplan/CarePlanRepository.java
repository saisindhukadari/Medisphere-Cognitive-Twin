package com.medisphere.careplan;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CarePlanRepository extends MongoRepository<CarePlan, String> {
    List<CarePlan> findByPatientId(String patientId);
}
