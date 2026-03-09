package com.expense.service.controller;

import com.expense.service.dto.ExpenseDto;
import com.expense.service.service.ExpenseService;
import com.expense.service.service.SseService;
import lombok.NonNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.http.MediaType;

import java.util.List;

@RestController
@RequestMapping("/expense/v1")
public class ExpenseController
{

    private final ExpenseService expenseService;
    private final SseService sseService;

    @Autowired
    ExpenseController(ExpenseService expenseService, SseService sseService){
        this.expenseService = expenseService;
        this.sseService = sseService;
    }

    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamExpenses(@RequestParam(value = "userId") @NonNull String userId) {
        return sseService.createEmitter(userId);
    }

    @GetMapping(path = "/getExpense")
    public ResponseEntity<List<ExpenseDto>> getExpense(@RequestHeader(value = "X-User-Id") @NonNull String userId){
         try{
            List<ExpenseDto> expenseDtoList = expenseService.getExpenses(userId);
            return new ResponseEntity<>(expenseDtoList, HttpStatus.OK);
         }catch(Exception ex){
             return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
         }
    }

    @PostMapping(path="/addExpense")
    public ResponseEntity<Boolean> addExpenses(@RequestHeader(value = "X-User-Id") @NonNull String userId, @RequestBody ExpenseDto expenseDto){
        try{
            expenseDto.setUserId(userId);
            return new ResponseEntity<>(expenseService.createExpense(expenseDto), HttpStatus.OK);
        }catch (Exception ex){
            ex.printStackTrace();
            return new ResponseEntity<>(false, HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping(path="/share")
    public ResponseEntity<String> shareReport(@RequestHeader(value = "X-User-Id") @NonNull String userId, @RequestParam(value = "monthYear") String monthYear) {
        try {
            String uuid = expenseService.createSharedReport(userId, monthYear);
            return new ResponseEntity<>(uuid, HttpStatus.OK);
        } catch(Exception ex){
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping(path="/public/report/{reportId}")
    public ResponseEntity<List<ExpenseDto>> getPublicReport(@PathVariable("reportId") String reportId) {
        try {
            List<ExpenseDto> expenses = expenseService.getSharedExpenses(reportId);
            if (expenses == null) {
                return new ResponseEntity<>(null, HttpStatus.NOT_FOUND); 
            }
            return new ResponseEntity<>(expenses, HttpStatus.OK);
        } catch(Exception ex){
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Boolean> checkHealth(){
        return new ResponseEntity<>(true, HttpStatus.OK);
    }

}
