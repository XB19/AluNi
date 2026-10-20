package tg.cdej.aluni.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import tg.cdej.aluni.dto.CourseDtos.CourseRef;
import tg.cdej.aluni.dto.LearningDtos.CertificateDto;
import tg.cdej.aluni.dto.UserDtos.CreatedAccount;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record LabelValue(String label, long value) {
    }

    public record PendingTrainer(Long id, String name, String email, String phone, String speciality, Instant date) {
    }

    public record PendingCourse(Long id, String slug, String title, String trainer, String category, int modules,
            Instant date) {
    }

    public record PendingEnrollment(Long id, String name, String profile, CourseRef course, Instant date) {
    }

    public record Validations(List<PendingTrainer> trainers, List<PendingCourse> courses,
            List<PendingEnrollment> enrollments, List<CertificateDto> certificates) {
    }

    public record DecisionRequest(String comment) {
    }

    public record AdminDashboard(Map<String, Object> stats, List<LabelValue> monthly, List<LabelValue> profiles,
            List<PendingTrainer> pendingTrainers, List<PendingCourse> pendingCourses,
            List<CertificateDto> latestCertificates) {
    }

    public record ImportRow(int line, String lastName, String firstName, LocalDate birthDate, String gender,
            String phone, String email, String error) {
    }

    public record ImportResult(List<ImportRow> rows, int valid, int invalid, List<CreatedAccount> created) {
    }

    public record ProfileRow(String profile, String label, long learners, long completed, int successRate,
            long certificates) {
    }

    public record Report(Map<String, Object> stats, List<LabelValue> monthly, List<LabelValue> successByCourse,
            List<ProfileRow> byProfile) {
    }
}
