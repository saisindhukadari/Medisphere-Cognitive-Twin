package com.medisphere.common;

import java.time.Instant;
import java.util.List;

public record ApiError(String timestamp, int status, String error, String message, String path) {
    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now().toString(), status, error, message, path);
    }
}
