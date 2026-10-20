package tg.cdej.aluni.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tg.cdej.aluni.dto.CourseDtos.CourseRef;

public final class ExamDtos {

    private ExamDtos() {
    }

    public record ExamSummary(Long id, String title, CourseRef course, int durationMin, int passMark,
            int attemptsAllowed, LocalDate opensAt, LocalDate closesAt, boolean roomOnly, int questionCount,
            boolean open, boolean showCorrection) {
    }

    public record AttemptRow(Long id, int number, Integer score, Boolean passed, Instant submittedAt, String status,
            int tabSwitches) {
    }

    public record MyExam(ExamSummary exam, List<AttemptRow> attempts, int attemptsLeft, boolean passed,
            Long inProgressAttemptId, int progress, String certificateCode) {
    }

    public record AttemptOption(int index, String text) {
    }

    public record AttemptQuestion(Long id, String type, String text, int points, List<AttemptOption> options) {
    }

    public record AttemptState(Long attemptId, String sessionToken, ExamSummary exam, long endsAt, long serverNow,
            List<AttemptQuestion> questions, Map<String, Object> answers, int currentIndex, List<Long> flagged,
            int tabSwitches, int number, boolean resumed) {
    }

    public record SaveRequest(Map<String, Object> answers, Integer currentIndex, List<Long> flagged) {
    }

    public record SaveResponse(Instant savedAt, long endsAt) {
    }

    public record EventRequest(@NotBlank String type) {
    }

    public record EventResponse(int tabSwitches) {
    }

    public record Correction(Long id, String text, String type, int points, int earned, boolean correct, String given,
            String expected) {
    }

    public record CertificateRef(String code, String status) {
    }

    public record AttemptResult(Long attemptId, int score, boolean passed, int passMark, int attemptsLeft,
            CertificateRef certificate, List<Correction> corrections, String courseSlug, String examTitle) {
    }

    public record ExamSettings(
            Long id,
            @NotBlank @Size(max = 200) String title,
            @Min(5) @Max(240) int durationMin,
            @Min(1) int questionCount,
            boolean randomize,
            @Min(0) @Max(100) int passMark,
            @Min(1) @Max(10) int attemptsAllowed,
            LocalDate opensAt,
            LocalDate closesAt,
            boolean showCorrection,
            boolean roomOnly,
            boolean requiresAdminValidation,
            @NotNull List<Long> questionIds) {
    }
}
