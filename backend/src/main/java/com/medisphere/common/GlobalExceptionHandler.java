package com.medisphere.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    public static class NotFoundException extends RuntimeException {
        public NotFoundException(String m) { super(m); }
    }

    public static class BadRequestException extends RuntimeException {
        public BadRequestException(String m) { super(m); }
    }

    public static class ConflictException extends RuntimeException {
        public ConflictException(String m) { super(m); }
    }

    private String path(WebRequest req) { return req.getDescription(false).replace("uri=", ""); }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> notFound(NotFoundException ex, WebRequest req) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiError.of(404, "Not Found", ex.getMessage(), path(req)));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiError> bad(BadRequestException ex, WebRequest req) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiError.of(400, "Bad Request", ex.getMessage(), path(req)));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> conflict(ConflictException ex, WebRequest req) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiError.of(409, "Conflict", ex.getMessage(), path(req)));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> denied(AccessDeniedException ex, WebRequest req) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of(403, "Forbidden", "You do not have permission to perform this action", path(req)));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex, WebRequest req) {
        StringBuilder sb = new StringBuilder();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            if (!sb.isEmpty()) sb.append("; ");
            sb.append(fe.getField()).append(" ").append(fe.getDefaultMessage());
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiError.of(400, "Validation Failed", sb.toString(), path(req)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> generic(Exception ex, WebRequest req) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiError.of(500, "Internal Server Error", ex.getMessage(), path(req)));
    }
}
