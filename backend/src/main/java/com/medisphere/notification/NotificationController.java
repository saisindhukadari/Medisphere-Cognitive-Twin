package com.medisphere.notification;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;
    private final NotificationRepository repository;

    public NotificationController(NotificationService service, NotificationRepository repository) {
        this.service = service;
        this.repository = repository;
    }

    @GetMapping
    public List<Notification> list() { return service.latest(); }

    @GetMapping("/unread-count")
    public Map<String, Long> unread() { return Map.of("count", repository.countByReadFalse()); }

    @PostMapping("/mark-all-read")
    public void markAll() {
        repository.findAll().forEach(n -> { n.setRead(true); repository.save(n); });
    }

    @PostMapping("/{id}/read")
    public void markRead(@PathVariable String id) {
        repository.findById(id).ifPresent(n -> { n.setRead(true); repository.save(n); });
    }
}
