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
            boolean roomOnly, int questionCount, boolean showCorrection) {
    }

    /** Créneau d'examen en salle. */
    public record SessionDto(Long id, Instant startsAt, Instant endsAt, boolean running, boolean past) {
    }

    /** Programmation d'une session : jour et heures (heure de Lomé). */
    public record SessionRequest(
            @NotNull(message = "Choisissez la date de l'examen.") LocalDate date,
            @NotNull(message = "Indiquez l'heure de début.") java.time.LocalTime start,
            @NotNull(message = "Indiquez l'heure de fin.") java.time.LocalTime end) {
    }

    public record AttemptRow(Long id, int number, Integer score, Boolean passed, Instant submittedAt, String status,
            int tabSwitches) {
    }

    /**
     * Examen final vu par l'apprenant, selon sa modalité (« salle » ou « en-ligne »).
     * attemptsLeft : null = tentatives illimitées (en ligne). canStart / blockedReason : décision du serveur.
     */
    public record MyExam(ExamSummary exam, String mode, List<AttemptRow> attempts, Integer attemptsLeft, boolean passed,
            Long inProgressAttemptId, int progress, String certificateCode, SessionDto currentSession,
            SessionDto nextSession, boolean canStart, String blockedReason) {
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

    /** attemptsLeft : null = tentatives illimitées (en ligne) ; canRetry : l'apprenant peut repasser l'examen. */
    public record AttemptResult(Long attemptId, int score, boolean passed, int passMark, String mode, Integer attemptsLeft, boolean canRetry,
            CertificateRef certificate, List<Correction> corrections, String courseSlug, String examTitle) {
    }

    public record ExamSettings(
            Long id,
            @NotBlank @Size(max = 200) String title,
            @Min(5) @Max(240) int durationMin,
            @Min(1) int questionCount,
            boolean randomize,
            @Min(0) @Max(100) int passMark,
            boolean showCorrection,
            boolean roomOnly,
            boolean requiresAdminValidation,
            @NotNull List<Long> questionIds) {
    }
}
