package tg.cdej.aluni.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import tg.cdej.aluni.dto.CourseDtos.CourseRef;
import tg.cdej.aluni.dto.CourseDtos.CourseSummary;

public final class LearningDtos {

    private LearningDtos() {
    }

    public record LessonRef(Long id, String title) {
    }

    public record EnrollmentDto(Long id, CourseSummary course, String status, Instant enrolledAt, int progress,
            int completedLessons, int totalLessons, LessonRef nextLesson) {
    }

    public record SubmissionDto(Long id, String learner, Long learnerId, CourseRef course, Long lessonId, String task,
            String fileName, String fileUrl, Instant date, String status, Integer grade, String comment) {
    }

    public record LearnLesson(Long id, String title, String type, String duration, String content, String videoUrl,
            String fileUrl, boolean practical, boolean completed, SubmissionDto submission) {
    }

    public record LearnModule(Long id, String title, int position, boolean unlocked, boolean done, Integer quizScore,
            boolean hasQuiz, List<LearnLesson> lessons) {
    }

    public record AttestationInfo(boolean available, boolean eligible, String code) {
    }

    public record LearnView(CourseSummary course, List<LearnModule> modules, int progress, Long examId,
            AttestationInfo attestation) {
    }

    public record ProgressDto(int progress, boolean courseCompleted) {
    }

    public record QuizQuestion(Long id, String text, List<String> options) {
    }

    public record QuizSubmit(@NotNull Map<Long, Integer> answers) {
    }

    public record QuizCorrection(Long id, int answer, Integer given, boolean correct) {
    }

    public record QuizResultDto(int score, List<QuizCorrection> results) {
    }

    public record NotificationDto(Long id, String type, String title, String text, Instant date, boolean read,
            String link) {
    }

    public record GradeRequest(
            @NotNull(message = "Note obligatoire") @Min(0) @Max(20) Integer grade,
            String comment) {
    }

    public record CertificateDto(String code, String name, CourseRef course, int hours, String type, LocalDate date,
            Integer score, String mention, String status, String signature, String template, String signatory,
            String signatoryTitle, String verifyUrl, String revokedReason) {
    }

    public record RevokeRequest(@NotBlank(message = "Indiquez le motif de la révocation.") String reason) {
    }

    public record FileDto(String url, String name, long size, String type) {
    }
}
