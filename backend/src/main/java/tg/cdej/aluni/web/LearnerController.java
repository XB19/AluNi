package tg.cdej.aluni.web;

import java.util.List;
import java.util.Map;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import tg.cdej.aluni.dto.ExamDtos.MyExam;
import tg.cdej.aluni.dto.LearningDtos.CertificateDto;
import tg.cdej.aluni.dto.LearningDtos.EnrollmentDto;
import tg.cdej.aluni.dto.LearningDtos.LearnView;
import tg.cdej.aluni.dto.LearningDtos.NotificationDto;
import tg.cdej.aluni.dto.LearningDtos.ProgressDto;
import tg.cdej.aluni.dto.LearningDtos.QuizQuestion;
import tg.cdej.aluni.dto.LearningDtos.QuizResultDto;
import tg.cdej.aluni.dto.LearningDtos.QuizSubmit;
import tg.cdej.aluni.dto.LearningDtos.SubmissionDto;
import tg.cdej.aluni.dto.UserDtos.PasswordChange;
import tg.cdej.aluni.dto.UserDtos.ProfileUpdate;
import tg.cdej.aluni.dto.UserDtos.UserDto;
import tg.cdej.aluni.security.CurrentUser;
import tg.cdej.aluni.service.AuthService;
import tg.cdej.aluni.service.CertificateService;
import tg.cdej.aluni.service.ExamService;
import tg.cdej.aluni.service.LearningService;
import tg.cdej.aluni.service.NotificationService;
import tg.cdej.aluni.service.TrainerService;

/** Espace personnel : inscriptions, cours, quiz, certificats, notifications et profil. */
@RestController
@RequestMapping("/api")
public class LearnerController {

    private final CurrentUser current;
    private final LearningService learning;
    private final ExamService exams;
    private final CertificateService certificates;
    private final NotificationService notifications;
    private final AuthService auth;
    private final TrainerService trainer;

    public LearnerController(CurrentUser current, LearningService learning, ExamService exams,
            CertificateService certificates, NotificationService notifications, AuthService auth,
            TrainerService trainer) {
        this.current = current;
        this.learning = learning;
        this.exams = exams;
        this.certificates = certificates;
        this.notifications = notifications;
        this.auth = auth;
        this.trainer = trainer;
    }

    // ----- Formations

    @PostMapping("/courses/{slug}/enroll")
    public EnrollmentDto enroll(@PathVariable String slug) {
        return learning.enroll(current.get(), slug);
    }

    @GetMapping("/me/enrollments")
    public List<EnrollmentDto> enrollments() {
        return learning.myEnrollments(current.get());
    }

    @GetMapping("/me/courses/{slug}/learn")
    public LearnView learn(@PathVariable String slug) {
        return learning.learn(current.get(), slug);
    }

    @PostMapping("/me/lessons/{id}/complete")
    public ProgressDto complete(@PathVariable Long id, @RequestBody(required = false) Map<String, Boolean> body) {
        boolean completed = body == null || body.getOrDefault("completed", true);
        return learning.completeLesson(current.get(), id, completed);
    }

    @GetMapping("/me/modules/{id}/quiz")
    public List<QuizQuestion> quiz(@PathVariable Long id) {
        return learning.quiz(current.get(), id);
    }

    @PostMapping("/me/modules/{id}/quiz")
    public QuizResultDto submitQuiz(@PathVariable Long id, @Valid @RequestBody QuizSubmit body) {
        return learning.submitQuiz(current.get(), id, body.answers());
    }

    @PostMapping("/me/courses/{slug}/attestation")
    public Map<String, String> attestation(@PathVariable String slug) {
        return Map.of("code", learning.attestation(current.get(), slug));
    }

    @PostMapping(path = "/me/lessons/{id}/submission", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SubmissionDto submit(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return learning.submitPractical(current.get(), id, file);
    }

    @GetMapping("/me/submissions")
    public List<SubmissionDto> submissions() {
        return learning.mySubmissions(current.get());
    }

    @GetMapping("/submissions/{id}/file")
    public ResponseEntity<Resource> submissionFile(@PathVariable Long id) {
        Map.Entry<String, Resource> file = trainer.submissionFile(current.get(), id);
        MediaType type = MediaTypeFactory.getMediaType(file.getKey()).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return Downloads.file(file.getValue(), file.getKey(), type, false);
    }

    // ----- Examens et certificats

    @GetMapping("/me/exams")
    public List<MyExam> myExams() {
        return exams.myExams(current.get());
    }

    @GetMapping("/me/certificates")
    public List<CertificateDto> myCertificates() {
        return certificates.mine(current.get());
    }

    @GetMapping("/certificates/{code}")
    public CertificateDto certificate(@PathVariable String code) {
        return certificates.get(code, current.get());
    }

    @GetMapping("/certificates/{code}/pdf")
    public ResponseEntity<byte[]> certificatePdf(@PathVariable String code) {
        return Downloads.file(certificates.pdf(code, current.get()), "certificat-" + code + ".pdf",
                MediaType.APPLICATION_PDF, false);
    }

    // ----- Notifications

    @GetMapping("/me/notifications")
    public List<NotificationDto> notifications() {
        return notifications.list(current.get());
    }

    @GetMapping("/me/notifications/unread-count")
    public Map<String, Long> unread() {
        return Map.of("count", notifications.unread(current.get()));
    }

    @PostMapping("/me/notifications/{id}/read")
    public void read(@PathVariable Long id) {
        notifications.markRead(current.get(), id);
    }

    @PostMapping("/me/notifications/read-all")
    public void readAll() {
        notifications.markAllRead(current.get());
    }

    // ----- Profil

    @PutMapping("/me/profile")
    public UserDto profile(@Valid @RequestBody ProfileUpdate body) {
        return auth.updateProfile(current.get(), body);
    }

    @PutMapping("/me/password")
    public Map<String, String> password(@Valid @RequestBody PasswordChange body) {
        auth.changePassword(current.get(), body);
        return Map.of("message", "Mot de passe modifié.");
    }

    @PostMapping(path = "/me/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserDto photo(@RequestParam("file") MultipartFile file) {
        return auth.updatePhoto(current.get(), file);
    }
}
