package com.medisphere;

import com.medisphere.vitals.RuleEngineService;
import com.medisphere.vitals.VitalReading;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RuleEngineServiceTest {
    private final RuleEngineService engine = new RuleEngineService();

    private VitalReading reading(String type, double value) {
        VitalReading v = new VitalReading();
        v.setType(type);
        v.setValue(value);
        return v;
    }

    @Test
    void tachycardiaThreshold() {
        var c = engine.evaluate(reading("HEART_RATE", 145));
        assertNotNull(c);
        assertEquals("CRITICAL", c.severity());
    }

    @Test
    void normalHeartRateNoAlert() {
        assertNull(engine.evaluate(reading("HEART_RATE", 75)));
    }

    @Test
    void lowSpo2Critical() {
        var c = engine.evaluate(reading("SPO2", 88));
        assertNotNull(c);
        assertEquals("LOW_OXYGEN", c.type());
    }

    @Test
    void hyperglycemiaCritical() {
        var c = engine.evaluate(reading("GLUCOSE", 300));
        assertNotNull(c);
        assertEquals("CRITICAL", c.severity());
    }

    @Test
    void feverDetected() {
        var c = engine.evaluate(reading("TEMPERATURE", 38.9));
        assertNotNull(c);
        assertEquals("FEVER", c.type());
    }
}
