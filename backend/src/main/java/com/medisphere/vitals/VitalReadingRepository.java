package com.medisphere.vitals;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface VitalReadingRepository extends MongoRepository<VitalReading, String> {
    List<VitalReading> findByPatientIdOrderByTimestampDesc(String patientId);
    List<VitalReading> findTop50ByOrderByTimestampDesc();

    /** Windowed reads used by the dashboard trend / live-vitals endpoints. */
    List<VitalReading> findByTimestampGreaterThanEqual(Instant from);
    List<VitalReading> findTop12ByTypeOrderByTimestampDesc(String type);
}
