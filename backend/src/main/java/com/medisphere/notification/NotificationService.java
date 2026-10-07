package com.medisphere.notification;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {
    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) { this.repository = repository; }

    public void notifyAll(String title, String message, String category, String referenceId) {
        Notification n = new Notification();
        n.setTitle(title);
        n.setMessage(message);
        n.setCategory(category);
        n.setReferenceId(referenceId);
        n.setCreatedAt(Instant.now());
        repository.save(n);
    }

    public List<Notification> latest() { return repository.findTop50ByOrderByCreatedAtDesc(); }
}
