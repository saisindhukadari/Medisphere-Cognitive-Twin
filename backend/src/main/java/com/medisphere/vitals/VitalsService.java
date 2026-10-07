package com.medisphere.vitals;

import com.medisphere.alerts.AlertService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class VitalsService {
    private static final Logger log = LoggerFactory.getLogger(VitalsService.class);
    private final VitalReadingRepository repository;
    private final RuleEngineService ruleEngine;
    private final AlertService alertService;

    public VitalsService(VitalReadingRepository repository, RuleEngineService ruleEngine, AlertService alertService) {
        this.repository = repository;
        this.ruleEngine = ruleEngine;
        this.alertService = alertService;
    }

    public VitalReading ingest(VitalReading reading) {
        reading = repository.save(reading);
        var candidate = ruleEngine.evaluate(reading);
        if (candidate != null) {
            try {
                alertService.createFromVital(reading, candidate);
            } catch (Exception e) {
                log.warn("Failed to create alert: {}", e.getMessage());
            }
        }
        return reading;
    }
}
