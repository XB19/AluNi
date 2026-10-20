package tg.cdej.aluni.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import tg.cdej.aluni.dto.CourseDtos.CourseRef;
import tg.cdej.aluni.dto.CourseDtos.TrainerCourseDto;
import tg.cdej.aluni.dto.LearningDtos.SubmissionDto;

public final class TrainerDtos {

    private TrainerDtos() {
    }

    public record ModuleRef(Long id, String title) {
    }

    public record QuestionDto(Long id, CourseRef course, ModuleRef module, String type, String text,
            List<String> options, List<Integer> correct, List<String> accepted, int points) {
    }

    public record QuestionRequest(
            @NotNull(message = "Choisissez la formation.") Long courseId,
            Long moduleId,
            @NotBlank String type,
            @NotBlank(message = "L'énoncé est obligatoire.") String text,
            List<String> options,
            List<Integer> correct,
            List<String> accepted,
            @Min(1) @Max(20) int points) {
    }

    public record TrainerLearnerDto(Long id, String name, String profile, String center, String phone,
            CourseRef course, int progress, Integer score, int attempts, int tabSwitches, String status,
            Instant enrolledAt) {
    }

    public record FraudAlert(Long learnerId, String name, String course, int tabSwitches) {
    }

    public record TrainerDashboard(Map<String, Object> stats, List<TrainerCourseDto> courses,
            List<FraudAlert> alerts, List<SubmissionDto> toGrade) {
    }
}
