package com.expense.service.repository;

import com.expense.service.entities.SharedReport;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface SharedReportRepository extends CrudRepository<SharedReport, String> {
    void deleteByExpiresAtBefore(LocalDateTime now);
}
