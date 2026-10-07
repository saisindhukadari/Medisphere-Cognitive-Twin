package com.medisphere.vitals;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class KafkaVitalsProducer {
    private final org.springframework.beans.factory.ObjectProvider<KafkaTemplate<String, Object>> templateProvider;
    private final boolean enabled;

    public KafkaVitalsProducer(org.springframework.beans.factory.ObjectProvider<KafkaTemplate<String, Object>> templateProvider,
                               @Value("${medisphere.kafka.enabled}") boolean enabled) {
        this.templateProvider = templateProvider;
        this.enabled = enabled;
    }

    public void publish(String topic, Object payload) {
        if (!enabled) return;
        try {
            var template = templateProvider.getIfAvailable();
            if (template != null) template.send(topic, payload);
        } catch (Exception ignored) {}
    }
}
