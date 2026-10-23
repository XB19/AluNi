package tg.cdej.aluni.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.common.Codes;
import tg.cdej.aluni.domain.AccessMode;
import tg.cdej.aluni.domain.AccountStatus;
import tg.cdej.aluni.domain.CertType;
import tg.cdej.aluni.domain.Certificate;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.CourseModule;
import tg.cdej.aluni.domain.CourseStatus;
import tg.cdej.aluni.domain.Enrollment;
import tg.cdej.aluni.domain.EnrollmentStatus;
import tg.cdej.aluni.domain.Lesson;
import tg.cdej.aluni.domain.LessonProgress;
import tg.cdej.aluni.domain.NotificationType;
import tg.cdej.aluni.domain.Question;
import tg.cdej.aluni.domain.QuizResult;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.Submission;
import tg.cdej.aluni.domain.SubmissionStatus;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.LearningDtos.AttestationInfo;
import tg.cdej.aluni.dto.LearningDtos.EnrollmentDto;
import tg.cdej.aluni.dto.LearningDtos.LearnLesson;
import tg.cdej.aluni.dto.LearningDtos.LearnModule;
import tg.cdej.aluni.dto.LearningDtos.LearnView;
import tg.cdej.aluni.dto.LearningDtos.LessonRef;
import tg.cdej.aluni.dto.LearningDtos.ProgressDto;
import tg.cdej.aluni.dto.LearningDtos.QuizCorrection;
import tg.cdej.aluni.dto.LearningDtos.QuizQuestion;
import tg.cdej.aluni.dto.LearningDtos.QuizResultDto;
import tg.cdej.aluni.dto.LearningDtos.SubmissionDto;
import tg.cdej.aluni.repository.CertificateRepository;
import tg.cdej.aluni.repository.CourseModuleRepository;
import tg.cdej.aluni.repository.CourseRepository;
import tg.cdej.aluni.repository.EnrollmentRepository;
import tg.cdej.aluni.repository.ExamRepository;
import tg.cdej.aluni.repository.LessonProgressRepository;
import tg.cdej.aluni.repository.LessonRepository;
import tg.cdej.aluni.repository.QuestionRepository;
import tg.cdej.aluni.repository.QuizResultRepository;
import tg.cdej.aluni.repository.SubmissionRepository;
import tg.cdej.aluni.repository.UserRepository;

@Service
public class LearningService {

    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final LessonRepository lessons;
    private final CourseModuleRepository modules;
    private final LessonProgressRepository progress;
    private final QuizResultRepository quizResults;
    private final QuestionRepository questions;
    private final ExamRepository exams;
    private final CertificateRepository certificates;
    private final SubmissionRepository submissions;
    private final UserRepository users;
    private final CertificateService certificateService;
    private final NotificationService notifications;
    private final StorageService storage;
    private final Mapper mapper;

    public LearningService(CourseRepository courses, EnrollmentRepository enrollments, LessonRepository lessons,
            CourseModuleRepository modules, LessonProgressRepository progress, QuizResultRepository quizResults,
            QuestionRepository questions, ExamRepository exams, CertificateRepository certificates,
            SubmissionRepository submissions, UserRepository users, CertificateService certificateService,
            NotificationService notifications, StorageService storage, Mapper mapper) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.lessons = lessons;
        this.modules = modules;
        this.progress = progress;
        this.quizResults = quizResults;
        this.questions = questions;
        this.exams = exams;
        this.certificates = certificates;
        this.submissions = submissions;
        this.users = users;
        this.certificateService = certificateService;
        this.notifications = notifications;
        this.storage = storage;
        this.mapper = mapper;
    }

    // ------------------------------------------------------------ Outils de progression

    private Set<Long> completedIds(User user, Course course) {
        return progress.findByUserAndLesson_Module_Course(user, course).stream().map(p -> p.getLesson().getId())
                .collect(Collectors.toSet());
    }

    public int percent(int done, int total) {
        return total == 0 ? 0 : Math.round(done * 100f / total);
    }

    public int progressOf(User user, Course course) {
        return percent((int) progress.countByUserAndLesson_Module_Course(user, course), course.lessonCount());
    }

    private static boolean moduleDone(CourseModule m, Set<Long> done) {
        return m.getLessons().stream().allMatch(l -> done.contains(l.getId()));
    }

    private static boolean unlocked(Course course, int index, Set<Long> done) {
        return index == 0 || moduleDone(course.getModules().get(index - 1), done);
    }

    private Enrollment activeEnrollment(User user, Course course) {
        Enrollment e = enrollments.findByUserAndCourse(user, course)
                .orElseThrow(() -> ApiException.forbidden("Vous n'êtes pas inscrit à cette formation."));
        if (e.getStatus() != EnrollmentStatus.ACTIF) throw ApiException.forbidden("Votre inscription n'est pas encore validée.");
        return e;
    }

    private Course course(String slug) {
        return courses.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Formation introuvable."));
    }

    // ------------------------------------------------------------ Inscriptions

    @Transactional
    public EnrollmentDto enroll(User user, String slug) {
        if (user.getRole() != Role.APPRENANT) throw ApiException.forbidden("L'inscription est réservée aux apprenants.");
        Course course = course(slug);
        if (course.getStatus() != CourseStatus.PUBLIEE) throw ApiException.badRequest("Cette formation n'est pas ouverte aux inscriptions.");
        Enrollment e = enrollments.findByUserAndCourse(user, course).orElse(null);
        if (e != null && e.getStatus() != EnrollmentStatus.REFUSE) return enrollmentDto(e);
        if (e == null) {
            e = new Enrollment();
            e.setUser(user);
            e.setCourse(course);
        }
        e.setEnrolledAt(Instant.now());
        e.setDecidedAt(null);
        if (course.getAccess() == AccessMode.LIBRE) {
            e.setStatus(EnrollmentStatus.ACTIF);
            notifications.notify(user, NotificationType.ENROLLMENT, "Inscription confirmée",
                    "Vous êtes inscrit à « " + course.getTitle() + " ». Bonne formation !", "/apprendre/" + slug);
        } else {
            e.setStatus(EnrollmentStatus.EN_ATTENTE);
            notifications.notifyAll(users.findByRoleAndStatusOrderByCreatedAtAsc(Role.ADMIN, AccountStatus.ACTIF),
                    NotificationType.ENROLLMENT, "Inscription à valider",
                    user.fullName() + " souhaite suivre « " + course.getTitle() + " ».", "/admin/validations");
        }
        return enrollmentDto(enrollments.save(e));
    }

    private EnrollmentDto enrollmentDto(Enrollment e) {
        Course c = e.getCourse();
        Set<Long> done = completedIds(e.getUser(), c);
        LessonRef next = c.getModules().stream().flatMap(m -> m.getLessons().stream())
                .filter(l -> !done.contains(l.getId())).findFirst()
                .map(l -> new LessonRef(l.getId(), l.getTitle())).orElse(null);
        int total = c.lessonCount();
        return new EnrollmentDto(e.getId(), mapper.summary(c), Codes.of(e.getStatus()), e.getEnrolledAt(),
                percent(done.size(), total), done.size(), total, next);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentDto> myEnrollments(User user) {
        return enrollments.findByUserOrderByEnrolledAtDesc(user).stream()
                .filter(e -> e.getStatus() != EnrollmentStatus.REFUSE).map(this::enrollmentDto).toList();
    }

    // ------------------------------------------------------------ Suivre un cours

    @Transactional(readOnly = true)
    public LearnView learn(User user, String slug) {
        Course course = course(slug);
        activeEnrollment(user, course);
        Set<Long> done = completedIds(user, course);
        Map<Long, Integer> quizScores = new HashMap<>();
        quizResults.findByUserAndModule_Course(user, course).forEach(q -> quizScores.put(q.getModule().getId(), q.getScore()));
        Map<Long, Submission> lastSubmissions = new HashMap<>();
        submissions.findByUserOrderBySubmittedAtDesc(user).stream().filter(s -> s.getLesson() != null)
                .forEach(s -> lastSubmissions.putIfAbsent(s.getLesson().getId(), s));

        List<LearnModule> view = new ArrayList<>();
        for (int i = 0; i < course.getModules().size(); i++) {
            CourseModule m = course.getModules().get(i);
            boolean open = unlocked(course, i, done);
            List<LearnLesson> ls = m.getLessons().stream().map(l -> new LearnLesson(l.getId(), l.getTitle(),
                    Codes.of(l.getType()), l.getDuration(), open ? l.getContent() : null, open ? l.getVideoUrl() : null,
                    open ? l.getFileUrl() : null, l.isPractical(), done.contains(l.getId()),
                    lastSubmissions.containsKey(l.getId()) ? mapper.submission(lastSubmissions.get(l.getId())) : null))
                    .toList();
            view.add(new LearnModule(m.getId(), m.getTitle(), i, open, moduleDone(m, done), quizScores.get(m.getId()),
                    !questions.findByModuleOrderByIdAsc(m).isEmpty(), ls));
        }
        int pct = percent(done.size(), course.lessonCount());
        Long examId = course.delivers(CertType.COMPETENCE) ? exams.findByCourse(course).map(e -> e.getId()).orElse(null) : null;
        String attestationCode = certificates.findByUserAndCourseAndType(user, course, CertType.ATTESTATION)
                .map(Certificate::getCode).orElse(null);
        return new LearnView(mapper.summary(course), view, pct, examId,
                new AttestationInfo(course.delivers(CertType.ATTESTATION), pct == 100, attestationCode));
    }

    @Transactional
    public ProgressDto completeLesson(User user, Long lessonId, boolean completed) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow(() -> ApiException.notFound("Leçon introuvable."));
        Course course = lesson.getModule().getCourse();
        Enrollment enrollment = activeEnrollment(user, course);
        Set<Long> done = completedIds(user, course);
        int index = course.getModules().indexOf(lesson.getModule());
        if (!unlocked(course, index, done)) throw ApiException.forbidden("Terminez d'abord le module précédent.");

        if (completed && !done.contains(lessonId)) {
            progress.save(new LessonProgress(user, lesson));
            done.add(lessonId);
        } else if (!completed && done.contains(lessonId)) {
            progress.deleteByUserAndLesson(user, lesson);
            done.remove(lessonId);
        }
        int pct = percent(done.size(), course.lessonCount());
        boolean finished = pct == 100;
        if (finished && enrollment.getCompletedAt() == null) {
            enrollment.setCompletedAt(Instant.now());
            if (course.delivers(CertType.ATTESTATION)) certificateService.issue(user, course, CertType.ATTESTATION, null, false);
            exams.findByCourse(course).ifPresent(exam -> notifications.notify(user, NotificationType.EXAM,
                    "Prêt pour l'examen final", "Vous avez terminé toutes les leçons de « " + course.getTitle()
                            + " ». L'examen final vous attend !", "/apprenant/examens"));
        }
        return new ProgressDto(pct, finished);
    }

    // ------------------------------------------------------------ Quiz d'entraînement

    private CourseModule accessibleModule(User user, Long moduleId) {
        CourseModule m = modules.findById(moduleId).orElseThrow(() -> ApiException.notFound("Module introuvable."));
        Course course = m.getCourse();
        activeEnrollment(user, course);
        if (!unlocked(course, course.getModules().indexOf(m), completedIds(user, course))) {
            throw ApiException.forbidden("Ce module n'est pas encore débloqué.");
        }
        return m;
    }

    @Transactional(readOnly = true)
    public List<QuizQuestion> quiz(User user, Long moduleId) {
        CourseModule m = accessibleModule(user, moduleId);
        return questions.findByModuleOrderByIdAsc(m).stream()
                .map(q -> new QuizQuestion(q.getId(), q.getText(), q.getOptions())).toList();
    }

    @Transactional
    public QuizResultDto submitQuiz(User user, Long moduleId, Map<Long, Integer> answers) {
        CourseModule m = accessibleModule(user, moduleId);
        List<Question> qs = questions.findByModuleOrderByIdAsc(m);
        if (qs.isEmpty()) throw ApiException.badRequest("Ce module n'a pas de quiz.");
        List<QuizCorrection> results = new ArrayList<>();
        int good = 0;
        for (Question q : qs) {
            int expected = q.getCorrectAnswers().isEmpty() ? -1 : q.getCorrectAnswers().get(0);
            Integer given = answers.get(q.getId());
            boolean ok = given != null && given == expected;
            if (ok) good++;
            results.add(new QuizCorrection(q.getId(), expected, given, ok));
        }
        int score = percent(good, qs.size());
        QuizResult r = quizResults.findByUserAndModule(user, m).orElseGet(QuizResult::new);
        r.setUser(user);
        r.setModule(m);
        r.setScore(score);
        r.setTakenAt(Instant.now());
        quizResults.save(r);
        return new QuizResultDto(score, results);
    }

    // ------------------------------------------------------------ Attestation et exercices

    @Transactional
    public String attestation(User user, String slug) {
        Course course = course(slug);
        activeEnrollment(user, course);
        if (!course.delivers(CertType.ATTESTATION)) throw ApiException.badRequest("Cette formation ne délivre pas d'attestation.");
        if (progressOf(user, course) < 100) throw ApiException.badRequest("Terminez toutes les leçons pour obtenir l'attestation.");
        return certificateService.issue(user, course, CertType.ATTESTATION, null, false).getCode();
    }

    @Transactional
    public SubmissionDto submitPractical(User user, Long lessonId, MultipartFile file) {
        Lesson lesson = lessons.findById(lessonId).orElseThrow(() -> ApiException.notFound("Leçon introuvable."));
        Course course = lesson.getModule().getCourse();
        activeEnrollment(user, course);
        if (!lesson.isPractical()) throw ApiException.badRequest("Cette leçon n'attend pas de dépôt de fichier.");
        Submission s = new Submission();
        s.setUser(user);
        s.setCourse(course);
        s.setLesson(lesson);
        s.setTask(lesson.getTitle());
        s.setFileName(file.getOriginalFilename() == null ? "fichier" : file.getOriginalFilename());
        s.setStoredFile(storage.storePrivate(file, "submissions", StorageService.SUBMISSIONS));
        s.setStatus(SubmissionStatus.A_CORRIGER);
        submissions.save(s);
        notifications.notify(course.getTrainer(), NotificationType.GRADE, "Exercice à corriger",
                user.fullName() + " a déposé « " + lesson.getTitle() + " ».", "/formateur/corrections");
        return mapper.submission(s);
    }

    @Transactional(readOnly = true)
    public List<SubmissionDto> mySubmissions(User user) {
        return submissions.findByUserOrderBySubmittedAtDesc(user).stream().map(mapper::submission).toList();
    }
}
