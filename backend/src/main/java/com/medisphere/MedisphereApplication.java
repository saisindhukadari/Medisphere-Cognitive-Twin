package com.medisphere;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class MedisphereApplication {
    public static void main(String[] args) {
        SpringApplication.run(MedisphereApplication.class, args);
    }
}
