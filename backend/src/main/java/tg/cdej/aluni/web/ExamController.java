package tg.cdej.aluni.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import tg.cdej.aluni.dto.ExamDtos.AttemptResult;
import tg.cdej.aluni.dto.ExamDtos.AttemptState;
import tg.cdej.aluni.dto.ExamDtos.EventRequest;
import tg.cdej.aluni.dto.ExamDtos.EventResponse;
import tg.cdej.aluni.dto.ExamDtos.SaveRequest;
import tg.cdej.aluni.dto.ExamDtos.SaveResponse;
import tg.cdej.aluni.security.CurrentUser;
import tg.cdej.aluni.service.ExamService;

/**
 * Passage des examens. Chaque requête pendant l'examen porte l'en-tête X-Exam-Session :
 * seule la dernière fenêtre ouverte peut répondre (une session active par compte).
 */
@RestController
public class ExamController {

    private static final String SESSION_HEADER = "X-Exam-Session";

    private final ExamService exams;
    private final CurrentUser current;

    public ExamController(ExamService exams, CurrentUser current) {
        this.exams = exams;
        this.current = current;
    }

    @PostMapping("/api/exams/{id}/attempts")
    public AttemptState start(@PathVariable Long id, HttpServletRequest request) {
        return exams.start(current.get(), id, request.getRemoteAddr());
    }

    @PutMapping("/api/exam-attempts/{id}")
    public SaveResponse save(@PathVariable Long id, @RequestHeader(value = SESSION_HEADER, required = false) String token,
            @RequestBody SaveRequest body) {
        return exams.save(current.get(), id, token, body);
    }

    @PostMapping("/api/exam-attempts/{id}/events")
    public EventResponse event(@PathVariable Long id, @RequestHeader(value = SESSION_HEADER, required = false) String token,
            @Valid @RequestBody EventRequest body) {
        return new EventResponse(exams.recordEvent(current.get(), id, token, body.type()));
    }

    @PostMapping("/api/exam-attempts/{id}/submit")
    public AttemptResult submit(@PathVariable Long id,
            @RequestHeader(value = SESSION_HEADER, required = false) String token) {
        return exams.submit(current.get(), id, token);
    }

    @GetMapping("/api/exam-attempts/{id}/result")
    public AttemptResult result(@PathVariable Long id) {
        return exams.result(current.get(), id);
    }
}
