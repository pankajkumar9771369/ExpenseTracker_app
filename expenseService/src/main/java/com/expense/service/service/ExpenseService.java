package com.expense.service.service;

import com.expense.service.dto.ExpenseDto;
import com.expense.service.entities.Expense;
import com.expense.service.repository.ExpenseRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import org.apache.logging.log4j.util.Strings;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class ExpenseService
{

    private final ExpenseRepository expenseRepository;
    private final SseService sseService;
    private final com.expense.service.repository.SharedReportRepository sharedReportRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    ExpenseService(ExpenseRepository expenseRepository, SseService sseService, com.expense.service.repository.SharedReportRepository sharedReportRepository){
        this.expenseRepository = expenseRepository;
        this.sseService = sseService;
        this.sharedReportRepository = sharedReportRepository;
    }

    public boolean createExpense(ExpenseDto expenseDto){
        setCurrency(expenseDto);
        
        // Auto-detect recurring subscriptions based on merchant name
        if (expenseDto.getIsRecurring() == null || !expenseDto.getIsRecurring()) {
            java.util.List<String> subKeywords = java.util.Arrays.asList(
                "netflix", "spotify", "gym", "aws", "hulu", "prime", "apple", "google", "internet", "electricity", "rent", "water", "gas"
            );
            String merchant = expenseDto.getMerchant() != null ? expenseDto.getMerchant().toLowerCase() : "";
            boolean isSub = subKeywords.stream().anyMatch(merchant::contains);
            expenseDto.setIsRecurring(isSub);
        }

        try{
            expenseRepository.save(objectMapper.convertValue(expenseDto, Expense.class));
            // Broadcast the new expense via Server-Sent Events for real-time alerts
            sseService.sendExpenseEvent(expenseDto.getUserId(), expenseDto);
            return true;
        }catch(Exception ex){
            ex.printStackTrace();
            return false;
        }
    }

    public boolean updateExpense(ExpenseDto expenseDto){
        setCurrency(expenseDto);
        Optional<Expense> expenseFoundOpt = expenseRepository.findByUserIdAndExternalId(expenseDto.getUserId(), expenseDto.getExternalId());
        if(expenseFoundOpt.isEmpty()){
            return false;
        }
        Expense expense = expenseFoundOpt.get();
        expense.setAmount(expenseDto.getAmount());
        expense.setMerchant(Strings.isNotBlank(expenseDto.getMerchant())?expenseDto.getMerchant():expense.getMerchant());
        expense.setCurrency(Strings.isNotBlank(expenseDto.getCurrency())?expenseDto.getMerchant():expense.getCurrency());
        expenseRepository.save(expense);
        return true;
    }

    public List<ExpenseDto> getExpenses(String userId){
        List<Expense> expenseOpt = expenseRepository.findByUserId(userId);
        return objectMapper.convertValue(expenseOpt, new TypeReference<List<ExpenseDto>>() {});
    }

    public String createSharedReport(String userId, String monthYear) {
        com.expense.service.entities.SharedReport report = new com.expense.service.entities.SharedReport();
        report.setId(java.util.UUID.randomUUID().toString());
        report.setUserId(userId);
        report.setMonthYear(monthYear);
        report.setExpiresAt(java.time.LocalDateTime.now().plusDays(7)); // Link expires in 7 days
        sharedReportRepository.save(report);
        return report.getId();
    }

    public List<ExpenseDto> getSharedExpenses(String reportId) {
        Optional<com.expense.service.entities.SharedReport> reportOpt = sharedReportRepository.findById(reportId);
        if(reportOpt.isEmpty() || reportOpt.get().getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            return null;
        }
        com.expense.service.entities.SharedReport report = reportOpt.get();
        List<Expense> userExpenses = expenseRepository.findByUserId(report.getUserId());
        
        // Filter expenses by the monthYear string (e.g. "Mar 2026")
        // Since dates are stored as java.util.Date we format them to match
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("MMM yyyy");
        List<Expense> filtered = userExpenses.stream()
            .filter(e -> report.getMonthYear().equals("All") || report.getMonthYear().equals(sdf.format(e.getCreatedAt())))
            .toList();

        return objectMapper.convertValue(filtered, new TypeReference<List<ExpenseDto>>() {});
    }

    private void setCurrency(ExpenseDto expenseDto){
        if(Objects.isNull(expenseDto.getCurrency())){
            expenseDto.setCurrency("inr");
        }
    }


}
