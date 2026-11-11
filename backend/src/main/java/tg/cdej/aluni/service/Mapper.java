package tg.cdej.aluni.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Component;

import tg.cdej.aluni.common.Codes;
import tg.cdej.aluni.config.AppProperties;
import tg.cdej.aluni.domain.Category;
import tg.cdej.aluni.domain.Certificate;
import tg.cdej.aluni.domain.ContactMessage;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.CourseStatus;
import tg.cdej.aluni.domain.EnrollmentStatus;
import tg.cdej.aluni.domain.Exam;
import tg.cdej.aluni.domain.ExamSession;
import tg.cdej.aluni.domain.FaqItem;
import tg.cdej.aluni.domain.News;
import tg.cdej.aluni.domain.Partner;
import tg.cdej.aluni.domain.Question;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.CourseDtos.CategoryDto;
import tg.cdej.aluni.dto.CourseDtos.CourseDetail;
import tg.cdej.aluni.dto.CourseDtos.CourseRef;
import tg.cdej.aluni.dto.CourseDtos.CourseSummary;
import tg.cdej.aluni.dto.CourseDtos.ExamInfo;
import tg.cdej.aluni.dto.CourseDtos.LessonOutline;
import tg.cdej.aluni.dto.CourseDtos.ModuleOutline;
import tg.cdej.aluni.dto.CourseDtos.TrainerDto;
import tg.cdej.aluni.dto.CourseDtos.TrainerRef;
import tg.cdej.aluni.dto.ExamDtos.ExamSummary;
import tg.cdej.aluni.dto.ExamDtos.SessionDto;
import tg.cdej.aluni.dto.LearningDtos.CertificateDto;
import tg.cdej.aluni.dto.SiteDtos.ContactMessageDto;
import tg.cdej.aluni.dto.SiteDtos.FaqDto;
import tg.cdej.aluni.dto.SiteDtos.NewsDto;
import tg.cdej.aluni.dto.SiteDtos.PartnerDto;
import tg.cdej.aluni.dto.TrainerDtos.ModuleRef;
import tg.cdej.aluni.dto.TrainerDtos.QuestionDto;
import tg.cdej.aluni.dto.UserDtos.AdminUserDto;
import tg.cdej.aluni.dto.UserDtos.UserDto;
import tg.cdej.aluni.repository.CourseRepository;
import tg.cdej.aluni.repository.EnrollmentRepository;

/** Conversion des entités en objets échangés avec le frontend. */
@Component
public class Mapper {

    private final EnrollmentRepository enrollments;
    private final CourseRepository courses;
    private final SettingsService settings;
    private final AppProperties props;

    public Mapper(EnrollmentRepository enrollments, CourseRepository courses, SettingsService settings,
            AppProperties props) {
        this.enrollments = enrollments;
        this.courses = courses;
        this.settings = settings;
        this.props = props;
    }

    public UserDto user(User u) {
        return new UserDto(u.getId(), Codes.of(u.getRole()), u.getFirstName(), u.getLastName(),
                Texts.display(u.getPhone()), u.getEmail(), Codes.of(u.getProfileType()), u.getCenterName(),
                u.getGender(), u.getBirthDate(), u.getPhotoUrl(), Codes.of(u.getStatus()), u.getSpeciality(),
                u.getTitle(), u.getBio());
    }

    public AdminUserDto adminUser(User u) {
        String profile = u.getProfileType() != null ? Codes.of(u.getProfileType()) : Codes.of(u.getRole());
        return new AdminUserDto(u.getId(), u.fullName(), u.getFirstName(), u.getLastName(), Codes.of(u.getRole()),
                profile, u.getCenterName(), Texts.display(u.getPhone()), u.getEmail(), Codes.of(u.getStatus()),
                LocalDate.ofInstant(u.getCreatedAt(), ZoneOffset.UTC), u.getSpeciality());
    }

    public CategoryDto category(Category c, long count) {
        return new CategoryDto(c.getSlug(), c.getId(), c.getName(), c.getIcon(), c.getColor(), count);
    }

    public TrainerRef trainerRef(User u) {
        return new TrainerRef(u.getId(), u.fullName(), u.getTitle());
    }

    public TrainerDto trainer(User u) {
        List<Course> published = courses.findByTrainerOrderByCreatedAtAsc(u).stream()
                .filter(c -> c.getStatus() == CourseStatus.PUBLIEE).toList();
        long learners = published.stream().mapToLong(this::learnerCount).sum();
        return new TrainerDto(u.getId(), u.fullName(), u.getTitle(), u.getBio(), learners, published.size(),
                u.getPhotoUrl());
    }

    public CourseRef courseRef(Course c) {
        return new CourseRef(c.getId(), c.getSlug(), c.getTitle());
    }

    public long learnerCount(Course c) {
        return enrollments.countByCourseAndStatus(c, EnrollmentStatus.ACTIF);
    }

    public List<String> certTypeCodes(Course c) {
        return c.getCertTypes().stream().map(t -> t.toLowerCase(Locale.ROOT)).toList();
    }

    public CourseSummary summary(Course c) {
        return new CourseSummary(c.getId(), c.getSlug(), c.getTitle(), c.getShortDescription(),
                c.getCategory().getSlug(), c.getCategory().getName(), c.getCategory().getIcon(),
                c.getCategory().getColor(), c.getLevel().label(), c.getHours(),
                c.getWeeks(), trainerRef(c.getTrainer()), certTypeCodes(c), Codes.of(c.getAccess()), learnerCount(c),
                c.getRating(), c.isPopular(), c.isFeaturedNew(), c.getImageUrl(), Codes.of(c.getStatus()));
    }

    public CourseDetail detail(Course c, Exam exam) {
        List<ModuleOutline> modules = c.getModules().stream()
                .map(m -> new ModuleOutline(m.getId(), m.getTitle(), m.getLessons().stream()
                        .map(l -> new LessonOutline(l.getId(), l.getTitle(), Codes.of(l.getType()), l.getDuration()))
                        .toList()))
                .toList();
        ExamInfo examInfo = exam == null ? null
                : new ExamInfo(exam.getId(), exam.getDurationMin(), exam.getPassMark(),
                        Math.min(exam.getQuestionCount(), exam.getQuestions().size()));
        return new CourseDetail(summary(c), c.getDescription(), c.getPrerequisites(), c.getObjectives(),
                c.getSkills(), modules, trainer(c.getTrainer()), examInfo, c.lessonCount());
    }

    /** Fuseau de l'Académie (Kpévé, Togo). */
    public static final java.time.ZoneId ZONE = java.time.ZoneId.of("Africa/Lome");
    private static final java.time.format.DateTimeFormatter WHEN =
            java.time.format.DateTimeFormatter.ofPattern("EEEE d MMMM 'à' HH'h'mm", Locale.FRENCH);
    private static final java.time.format.DateTimeFormatter HOUR = java.time.format.DateTimeFormatter.ofPattern("HH'h'mm");

    public static String when(Instant i) {
        return WHEN.format(i.atZone(ZONE));
    }

    public static String hour(Instant i) {
        return HOUR.format(i.atZone(ZONE));
    }

    public SessionDto session(ExamSession s) {
        Instant now = Instant.now();
        return new SessionDto(s.getId(), s.getStartsAt(), s.getEndsAt(), s.isRunning(now), !s.getEndsAt().isAfter(now));
    }

    public ExamSummary exam(Exam e) {
        return new ExamSummary(e.getId(), e.getTitle(), courseRef(e.getCourse()), e.getDurationMin(), e.getPassMark(),
                e.isRoomOnly(), Math.min(e.getQuestionCount(), e.getQuestions().size()), e.isShowCorrection());
    }

    public String verifyUrl(String code) {
        return props.frontendUrl() + "/verifier/" + code;
    }

    public CertificateDto certificate(Certificate c) {
        return new CertificateDto(c.getCode(), c.getHolderName(), courseRef(c.getCourse()), c.getCourse().getHours(),
                Codes.of(c.getType()), c.getIssuedAt(), c.getScore(), c.getMention(), Codes.of(c.getStatus()),
                c.getSignature().substring(0, 8).toUpperCase(Locale.ROOT), settings.get("certificate.template"),
                settings.get("certificate.signatory"), settings.get("certificate.signatoryTitle"),
                verifyUrl(c.getCode()), c.getRevokedReason());
    }

    public QuestionDto question(Question q) {
        return new QuestionDto(q.getId(), courseRef(q.getCourse()),
                q.getModule() == null ? null : new ModuleRef(q.getModule().getId(), q.getModule().getTitle()),
                Codes.of(q.getType()), q.getText(), q.getOptions(), q.getCorrectAnswers(), q.getAcceptedAnswers(),
                q.getPoints());
    }

    public NewsDto news(News n) {
        List<String> body = n.getBody() == null ? List.of()
                : Arrays.stream(n.getBody().split("\\R\\s*\\R")).map(String::trim).filter(p -> !p.isEmpty()).toList();
        return new NewsDto(n.getId(), n.getSlug(), n.getTitle(), n.getPublishedAt(), n.getCategory(), n.getExcerpt(),
                body, n.getImageUrl(), n.isPublished());
    }

    public PartnerDto partner(Partner p) {
        return new PartnerDto(p.getId(), p.getName(), p.getLogoUrl(), p.getWebsite());
    }

    public FaqDto faq(FaqItem f) {
        return new FaqDto(f.getId(), f.getQuestion(), f.getAnswer(), f.getTag());
    }

    public ContactMessageDto contact(ContactMessage m) {
        return new ContactMessageDto(m.getId(), m.getName(), m.getPhone(), m.getEmail(), m.getSubject(),
                m.getMessage(), m.getCreatedAt(), m.isHandled());
    }
}
