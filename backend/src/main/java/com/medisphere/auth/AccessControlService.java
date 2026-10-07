package com.medisphere.auth;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Backend authorization helper for data-level (not just endpoint-level) RBAC.
 *
 * <p>PATIENT users may only access records belonging to their own patient
 * profile. Staff roles (ADMIN, SUPER_ADMIN, PROVIDER, CARE_MANAGER) have
 * broader access to clinical records.</p>
 */
@Service
public class AccessControlService {
    private final UserRepository userRepository;

    public AccessControlService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User currentUser() {
        String email = CurrentUser.email();
        return userRepository.findByEmail(email).orElse(null);
    }

    public boolean isPatientRole() {
        return "PATIENT".equals(CurrentUser.role());
    }

    public String ownPatientId() {
        User u = currentUser();
        return u == null ? null : u.getPatientId();
    }

    /**
     * Throws AccessDeniedException when a PATIENT user tries to access another
     * patient's record. Staff roles always pass.
     */
    public void checkPatientAccess(String patientId) {
        if (!isPatientRole()) return;
        String own = ownPatientId();
        if (patientId == null || !patientId.equals(own)) {
            throw new AccessDeniedException("Patients may only access their own records");
        }
    }

    /** Returns the patientId a PATIENT user is limited to, or null for staff (no restriction). */
    public String scopedPatientIdOrNull() {
        return isPatientRole() ? ownPatientId() : null;
    }
}
