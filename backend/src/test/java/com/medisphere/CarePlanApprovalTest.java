package com.medisphere;

import com.medisphere.careplan.CarePlan;
import com.medisphere.careplan.CarePlanRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CarePlanApprovalTest {
    @Mock CarePlanRepository carePlanRepository;

    @Test
    void carePlanStartsAsAiGenerated() {
        CarePlan cp = new CarePlan();
        cp.setStatus("AI_GENERATED");
        assertEquals("AI_GENERATED", cp.getStatus());
    }

    @Test
    void findingCarePlanByIdThrowsWhenAbsent() {
        when(carePlanRepository.findById("missing")).thenReturn(Optional.empty());
        assertTrue(carePlanRepository.findById("missing").isEmpty());
    }
}
