package com.medisphere.audit;

import com.medisphere.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-logs")
@org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN','PROVIDER','CARE_MANAGER','SUPER_ADMIN')")
public class AuditController {
    private final AuditLogRepository repository;

    public AuditController(AuditLogRepository repository) { this.repository = repository; }

    @GetMapping
    public PageResponse<AuditLog> list(@RequestParam(defaultValue = "") String user,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        var pg = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        return PageResponse.of(user.isBlank()
                ? repository.findAllByOrderByTimestampDesc(pg)
                : repository.findByUserContainingIgnoreCaseOrderByTimestampDesc(user, pg));
    }
}
