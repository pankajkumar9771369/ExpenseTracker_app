package com.expense.service.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "shared_reports")
@Data
public class SharedReport {
    @Id
    private String id; // UUID
    private String userId;
    private String monthYear;
    private LocalDateTime expiresAt;
}
