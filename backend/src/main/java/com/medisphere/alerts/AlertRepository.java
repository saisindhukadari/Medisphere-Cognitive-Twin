package com.medisphere.alerts;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Optional;

public interface AlertRepository extends MongoRepository<Alert, String> {
    Page<Alert> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<Alert> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Alert> findByPatientIdOrderByCreatedAtDesc(String patientId, Pageable pageable);
    Page<Alert> findByPatientIdAndStatusOrderByCreatedAtDesc(String patientId, String status, Pageable pageable);
    long countByStatus(String status);
    long countByCategory(String category);
    Optional<Alert> findByPatientIdAndTypeAndStatusAndCreatedAtAfter(String patientId, String type, String status, Instant after);
}
