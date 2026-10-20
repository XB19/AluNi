package tg.cdej.aluni.dto;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonUnwrapped;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class CourseDtos {

    private CourseDtos() {
    }

    public record CategoryDto(String id, Long dbId, String name, String icon, String color, long count) {
    }

    public record CategoryRequest(@NotBlank @Size(max = 120) String name, String icon, String color) {
    }

    public record TrainerRef(Long id, String name, String title) {
    }

    public record TrainerDto(Long id, String name, String title, String bio, long learners, long courses, String photo) {
    }

    public record CourseRef(Long id, String slug, String title) {
    }

    public record CourseSummary(
            Long id,
            String slug,
            String title,
            @JsonProperty("short") String shortDescription,
            String category,
            String categoryName,
            String categoryIcon,
            String categoryColor,
            String level,
            int hours,
            int weeks,
            TrainerRef trainer,
            List<String> certTypes,
            String access,
            long learners,
            double rating,
            boolean popular,
            @JsonProperty("isNew") boolean featuredNew,
            String image,
            String status) {
    }

    public record LessonOutline(Long id, String title, String type, String duration) {
    }

    public record ModuleOutline(Long id, String title, List<LessonOutline> lessons) {
    }

    public record ExamInfo(Long id, int durationMin, int passMark, int questionCount, int attemptsAllowed) {
    }

    public record CourseDetail(
            @JsonUnwrapped CourseSummary summary,
            String description,
            List<String> prerequisites,
            List<String> objectives,
            List<String> skills,
            List<ModuleOutline> modules,
            TrainerDto trainerProfile,
            ExamInfo exam,
            int lessonCount) {
    }

    // ----- Édition par le formateur

    public record LessonEdit(
            Long id,
            @NotBlank(message = "Titre de leçon obligatoire") @Size(max = 200) String title,
            String type,
            @Size(max = 40) String duration,
            String content,
            String videoUrl,
            String fileUrl,
            boolean practical) {
    }

    public record ModuleEdit(
            Long id,
            @NotBlank(message = "Titre de module obligatoire") @Size(max = 200) String title,
            @Valid List<LessonEdit> lessons) {
    }

    public record CourseEdit(
            Long id,
            String slug,
            @NotBlank(message = "Le titre est obligatoire") @Size(max = 200) String title,
            @JsonProperty("short") @Size(max = 500) String shortDescription,
            String description,
            @NotBlank String category,
            @NotBlank String level,
            @Min(1) int hours,
            @Min(1) int weeks,
            List<String> prerequisites,
            List<String> objectives,
            List<String> skills,
            List<String> certTypes,
            String access,
            String image,
            String status,
            @Valid List<ModuleEdit> modules,
            String reviewComment) {
    }

    public record TrainerCourseDto(Long id, String slug, String title, String status, String category,
            String categoryIcon, String categoryColor, int modules,
            int lessons, long enrolled, String image, String reviewComment, Instant updatedAt) {
    }

    public record AdminCourseDto(Long id, String slug, String title, String category, String categoryName, String level,
            String trainer, long learners, String access, String status) {
    }

    public record CourseStatusPatch(@NotBlank String status, String comment) {
    }
}
