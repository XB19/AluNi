package tg.cdej.aluni.service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.common.Codes;
import tg.cdej.aluni.domain.AccessMode;
import tg.cdej.aluni.domain.AccountStatus;
import tg.cdej.aluni.domain.AttemptStatus;
import tg.cdej.aluni.domain.CertType;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.CourseModule;
import tg.cdej.aluni.domain.CourseStatus;
import tg.cdej.aluni.domain.Enrollment;
import tg.cdej.aluni.domain.EnrollmentStatus;
import tg.cdej.aluni.domain.Exam;
import tg.cdej.aluni.domain.ExamSession;
import tg.cdej.aluni.domain.LearningMode;
import tg.cdej.aluni.domain.ExamAttempt;
import tg.cdej.aluni.domain.Lesson;
import tg.cdej.aluni.domain.LessonType;
import tg.cdej.aluni.domain.Level;
import tg.cdej.aluni.domain.NotificationType;
import tg.cdej.aluni.domain.Question;
import tg.cdej.aluni.domain.QuestionType;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.CourseDtos.CourseEdit;
import tg.cdej.aluni.dto.CourseDtos.LessonEdit;
import tg.cdej.aluni.dto.CourseDtos.ModuleEdit;
import tg.cdej.aluni.dto.CourseDtos.TrainerCourseDto;
import tg.cdej.aluni.dto.ExamDtos.ExamSettings;
import tg.cdej.aluni.dto.ExamDtos.SessionDto;
import tg.cdej.aluni.dto.ExamDtos.SessionRequest;
import tg.cdej.aluni.dto.TrainerDtos.ExamResultRow;
import tg.cdej.aluni.dto.TrainerDtos.FraudAlert;
import tg.cdej.aluni.dto.TrainerDtos.QuestionDto;
import tg.cdej.aluni.dto.TrainerDtos.QuestionRequest;
import tg.cdej.aluni.dto.TrainerDtos.TrainerDashboard;
import tg.cdej.aluni.dto.TrainerDtos.TrainerLearnerDto;
import tg.cdej.aluni.repository.CategoryRepository;
import tg.cdej.aluni.repository.CourseModuleRepository;
import tg.cdej.aluni.repository.CourseRepository;
import tg.cdej.aluni.repository.EnrollmentRepository;
import tg.cdej.aluni.repository.ExamAttemptRepository;
import tg.cdej.aluni.repository.ExamSessionRepository;
import tg.cdej.aluni.repository.ExamRepository;
import tg.cdej.aluni.repository.QuestionRepository;
import tg.cdej.aluni.repository.UserRepository;

@Service
public class TrainerService {

    private final CourseRepository courses;
    private final CategoryRepository categories;
    private final CourseModuleRepository modules;
    private final EnrollmentRepository enrollments;
    private final ExamRepository exams;
    private final ExamAttemptRepository attempts;
    private final ExamSessionRepository sessions;
    private final QuestionRepository questions;
    private final UserRepository users;
    private final LearningService learning;
    private final NotificationService notifications;
    private final StorageService storage;
    private final Mapper mapper;

    public TrainerService(CourseRepository courses, CategoryRepository categories, CourseModuleRepository modules,
            EnrollmentRepository enrollments, ExamRepository exams, ExamAttemptRepository attempts, ExamSessionRepository sessions,
            QuestionRepository questions, UserRepository users,
            LearningService learning, NotificationService notifications, StorageService storage, Mapper mapper) {
        this.courses = courses;
        this.categories = categories;
        this.modules = modules;
        this.enrollments = enrollments;
        this.exams = exams;
        this.attempts = attempts;
        this.sessions = sessions;
        this.questions = questions;
        this.users = users;
        this.learning = learning;
        this.notifications = notifications;
        this.storage = storage;
        this.mapper = mapper;
    }

    // ------------------------------------------------------------ Accès

    private List<Course> myCourses(User user) {
        return user.getRole() == Role.ADMIN ? courses.findAll() : courses.findByTrainerOrderByCreatedAtAsc(user);
    }

    private Course owned(User user, Long id) {
        Course c = courses.findById(id).orElseThrow(() -> ApiException.notFound("Formation introuvable."));
        if (user.getRole() != Role.ADMIN && !c.getTrainer().getId().equals(user.getId())) {
            throw ApiException.forbidden("Cette formation ne vous appartient pas.");
        }
        return c;
    }

    /** Formation du formateur connecté (toutes les formations pour l'administrateur). */
    @Transactional(readOnly = true)
    public Course ownedCourse(User user, Long id) {
        return owned(user, id);
    }

    private TrainerCourseDto row(Course c) {
        return new TrainerCourseDto(c.getId(), c.getSlug(), c.getTitle(), Codes.of(c.getStatus()), c.getCategory().getSlug(),
                c.getCategory().getIcon(), c.getCategory().getColor(), c.getModules().size(), c.lessonCount(), mapper.learnerCount(c), c.getImageUrl(),
                c.getUpdatedAt() == null ? c.getCreatedAt() : c.getUpdatedAt());
    }

    // ------------------------------------------------------------ Tableau de bord

    @Transactional(readOnly = true)
    public TrainerDashboard dashboard(User user) {
        List<Course> mine = myCourses(user);
        List<Enrollment> active = enrollments.findByCourseIn(mine).stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIF).toList();
        Instant monthAgo = Instant.now().minus(30, ChronoUnit.DAYS);
        List<ExamAttempt> done = attempts.findByExam_CourseIn(mine).stream()
                .filter(a -> a.getStatus() == AttemptStatus.SOUMIS).toList();
        long passed = done.stream().filter(a -> Boolean.TRUE.equals(a.getPassed())).count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("learners", active.stream().map(e -> e.getUser().getId()).distinct().count());
        stats.put("newThisMonth", active.stream().filter(e -> e.getEnrolledAt().isAfter(monthAgo)).count());
        stats.put("published", mine.stream().filter(c -> c.getStatus() == CourseStatus.PUBLIEE).count());
        stats.put("drafts", mine.stream().filter(c -> c.getStatus() == CourseStatus.BROUILLON).count());
        stats.put("successRate", done.isEmpty() ? null : Math.round(passed * 100f / done.size()));
        stats.put("graded", done.size()); // examens corrigés automatiquement

        Map<String, FraudAlert> alerts = new LinkedHashMap<>();
        done.stream().filter(a -> a.getTabSwitches() > 0)
                .sorted((a, b) -> b.getSubmittedAt().compareTo(a.getSubmittedAt()))
                .forEach(a -> alerts.merge(a.getUser().getId() + ":" + a.getExam().getId(),
                        new FraudAlert(a.getUser().getId(), a.getUser().fullName(), a.getExam().getCourse().getTitle(), a.getTabSwitches()),
                        (x, y) -> new FraudAlert(x.learnerId(), x.name(), x.course(), x.tabSwitches() + y.tabSwitches())));

        return new TrainerDashboard(stats, mine.stream().map(this::row).toList(),
                alerts.values().stream().limit(8).toList(),
                done.stream().sorted((a, b) -> b.getSubmittedAt().compareTo(a.getSubmittedAt())).limit(6)
                        .map(a -> new ExamResultRow(a.getUser().getId(), a.getUser().fullName(), a.getExam().getCourse().getTitle(),
                                a.getScore() == null ? 0 : a.getScore(), Boolean.TRUE.equals(a.getPassed()), a.getSubmittedAt()))
                        .toList());
    }

    @Transactional(readOnly = true)
    public List<TrainerCourseDto> courses(User user) {
        return myCourses(user).stream().map(this::row).toList();
    }

    // ------------------------------------------------------------ Édition d'une formation

    @Transactional(readOnly = true)
    public CourseEdit get(User user, Long id) {
        return edit(owned(user, id));
    }

    private CourseEdit edit(Course c) {
        List<ModuleEdit> ms = c.getModules().stream().map(m -> new ModuleEdit(m.getId(), m.getTitle(),
                m.getLessons().stream().map(l -> new LessonEdit(l.getId(), l.getTitle(), Codes.of(l.getType()),
                        l.getDuration(), l.getContent(), l.getVideoUrl(), l.getFileUrl())).toList()))
                .toList();
        return new CourseEdit(c.getId(), c.getSlug(), c.getTitle(), c.getShortDescription(), c.getDescription(),
                c.getCategory().getSlug(), c.getLevel().label(), c.getHours(), c.getWeeks(), c.getPrerequisites(),
                c.getObjectives(), c.getSkills(), mapper.certTypeCodes(c), Codes.of(c.getAccess()), c.getImageUrl(),
                c.getSupportUrl(), Codes.of(c.getStatus()), ms);
    }

    private static List<String> clean(List<String> values) {
        return values == null ? new ArrayList<>()
                : values.stream().filter(v -> v != null && !v.isBlank()).map(String::trim).collect(Collectors.toList());
    }

    @Transactional
    public CourseEdit create(User user, CourseEdit r) {
        Course c = new Course();
        c.setTrainer(user);
        c.setStatus(CourseStatus.BROUILLON);
        String base = Texts.slugify(r.title());
        String slug = base;
        for (int i = 2; courses.existsBySlug(slug); i++) slug = base + "-" + i;
        c.setSlug(slug);
        apply(c, r);
        courses.save(c);
        return edit(c);
    }

    @Transactional
    public CourseEdit update(User user, Long id, CourseEdit r) {
        Course c = owned(user, id);
        int before = c.lessonCount();
        apply(c, r);
        c.setUpdatedAt(Instant.now());
        courses.saveAndFlush(c);
        int added = c.lessonCount() - before;
        if (added > 0 && c.getStatus() == CourseStatus.PUBLIEE) {
            List<User> learners = enrollments.findByCourseIn(List.of(c)).stream()
                    .filter(e -> e.getStatus() == EnrollmentStatus.ACTIF).map(Enrollment::getUser).toList();
            notifications.notifyAll(learners, NotificationType.LESSON, "Nouvelle leçon",
                    added + " nouvelle(s) leçon(s) ajoutée(s) à « " + c.getTitle() + " ».", "/apprendre/" + c.getSlug());
        }
        return edit(c);
    }

    private void apply(Course c, CourseEdit r) {
        c.setTitle(r.title().trim());
        c.setShortDescription(r.shortDescription());
        c.setDescription(r.description());
        c.setCategory(categories.findBySlug(r.category()).orElseThrow(() -> ApiException.badRequest("Domaine inconnu.")));
        c.setLevel(Level.fromLabel(r.level()));
        c.setHours(r.hours());
        c.setWeeks(r.weeks());
        c.setPrerequisites(clean(r.prerequisites()));
        c.setObjectives(clean(r.objectives()));
        c.setSkills(clean(r.skills()));
        List<String> certs = clean(r.certTypes()).stream()
                .map(t -> Codes.require(CertType.class, t, "certification").name()).distinct().collect(Collectors.toList());
        if (certs.isEmpty()) throw ApiException.badRequest("Choisissez au moins un type de certification.");
        c.setCertTypes(certs);
        c.setAccess(r.access() == null ? AccessMode.LIBRE : Codes.require(AccessMode.class, r.access(), "accès"));
        c.setImageUrl(r.image());
        c.setSupportUrl(r.support() == null || r.support().isBlank() ? null : r.support());
        if (r.modules() != null) syncModules(c, r.modules());
    }

    /** Met à jour les modules et leçons existants, crée les nouveaux et supprime ceux qui ont été retirés. */
    private void syncModules(Course c, List<ModuleEdit> edits) {
        Map<Long, CourseModule> existing = c.getModules().stream()
                .collect(Collectors.toMap(CourseModule::getId, Function.identity()));
        List<CourseModule> ordered = new ArrayList<>();
        for (int i = 0; i < edits.size(); i++) {
            ModuleEdit me = edits.get(i);
            CourseModule m = me.id() != null && existing.containsKey(me.id()) ? existing.get(me.id()) : new CourseModule();
            m.setCourse(c);
            m.setTitle(me.title().trim());
            m.setPosition(i);
            Map<Long, Lesson> lessons = m.getLessons().stream().filter(l -> l.getId() != null)
                    .collect(Collectors.toMap(Lesson::getId, Function.identity()));
            List<Lesson> orderedLessons = new ArrayList<>();
            List<LessonEdit> les = me.lessons() == null ? List.of() : me.lessons();
            for (int j = 0; j < les.size(); j++) {
                LessonEdit le = les.get(j);
                Lesson l = le.id() != null && lessons.containsKey(le.id()) ? lessons.get(le.id()) : new Lesson();
                l.setModule(m);
                l.setPosition(j);
                l.setTitle(le.title().trim());
                l.setType(le.type() == null ? LessonType.TEXTE : Codes.require(LessonType.class, le.type(), "type de leçon"));
                l.setDuration(le.duration());
                l.setContent(le.content());
                l.setVideoUrl(le.videoUrl());
                l.setFileUrl(le.fileUrl());
                orderedLessons.add(l);
            }
            m.getLessons().clear();
            m.getLessons().addAll(orderedLessons);
            ordered.add(m);
        }
        c.getModules().clear();
        c.getModules().addAll(ordered);
    }

    /** Publication directe : la formation devient visible dans le catalogue immédiatement, sans validation préalable. */
    @Transactional
    public CourseEdit publish(User user, Long id) {
        Course c = owned(user, id);
        if (c.getStatus() == CourseStatus.PUBLIEE) throw ApiException.badRequest("Cette formation est déjà publiée.");
        if (c.getStatus() == CourseStatus.ARCHIVEE) {
            throw ApiException.forbidden("Cette formation a été archivée par l'administration : contactez l'Académie pour la republier.");
        }
        if (c.getModules().isEmpty() || c.lessonCount() == 0) throw ApiException.badRequest("Ajoutez au moins un module et une leçon.");
        if (c.delivers(CertType.COMPETENCE)) {
            Exam exam = exams.findByCourse(c).orElse(null);
            if (exam == null || exam.getQuestions().isEmpty()) {
                throw ApiException.badRequest("Configurez l'examen final et ses questions avant de publier.");
            }
        }
        c.setStatus(CourseStatus.PUBLIEE);
        if (c.getPublishedAt() == null) c.setPublishedAt(Instant.now());
        // Information de l'administration (aucune action requise : elle peut archiver la formation si besoin)
        notifications.notifyAll(users.findByRoleAndStatusOrderByCreatedAtAsc(Role.ADMIN, AccountStatus.ACTIF),
                NotificationType.COURSE, "Nouvelle formation publiée",
                c.getTrainer().fullName() + " a publié « " + c.getTitle() + " » dans le catalogue.", "/admin/formations");
        return edit(c);
    }

    // ------------------------------------------------------------ Examen final

    @Transactional(readOnly = true)
    public ExamSettings examSettings(User user, Long courseId) {
        Course c = owned(user, courseId);
        return exams.findByCourse(c).map(TrainerService::settings)
                .orElse(new ExamSettings(null, "Examen final – " + c.getTitle(), 20, 10, true, 60, true,
                        false, false, List.of()));
    }

    private static ExamSettings settings(Exam e) {
        return new ExamSettings(e.getId(), e.getTitle(), e.getDurationMin(), e.getQuestionCount(), e.isRandomize(),
                e.getPassMark(), e.isShowCorrection(),
                e.isRoomOnly(), e.isRequiresAdminValidation(), e.getQuestions().stream().map(Question::getId).toList());
    }

    @Transactional
    public ExamSettings saveExam(User user, Long courseId, ExamSettings s) {
        Course c = owned(user, courseId);
        Exam e = exams.findByCourse(c).orElseGet(() -> {
            Exam created = new Exam();
            created.setCourse(c);
            return created;
        });
        boolean isNew = e.getId() == null;
        List<Question> selected = questions.findAllById(s.questionIds()).stream()
                .filter(q -> q.getCourse().getId().equals(c.getId()) && q.getModule() == null).toList();
        e.setTitle(s.title().trim());
        e.setDurationMin(s.durationMin());
        e.setQuestionCount(s.questionCount());
        e.setRandomize(s.randomize());
        e.setPassMark(s.passMark());
        e.setShowCorrection(s.showCorrection());
        e.setRoomOnly(s.roomOnly());
        e.setRequiresAdminValidation(s.requiresAdminValidation());
        e.getQuestions().clear();
        e.getQuestions().addAll(selected);
        exams.save(e);
        if (isNew && c.getStatus() == CourseStatus.PUBLIEE) {
            List<User> learners = enrollments.findByCourseIn(List.of(c)).stream()
                    .filter(x -> x.getStatus() == EnrollmentStatus.ACTIF).map(Enrollment::getUser).toList();
            notifications.notifyAll(learners, NotificationType.EXAM, "Examen ouvert",
                    "L'examen final « " + c.getTitle() + " » est disponible.", "/apprenant/examens");
        }
        return settings(e);
    }

    // ------------------------------------------------------------ Banque de questions

    @Transactional(readOnly = true)
    public List<QuestionDto> questions(User user, String courseSlug, String type, String q) {
        String term = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        QuestionType qt = Codes.parse(QuestionType.class, type);
        return questions.findByCourseInOrderByCreatedAtDesc(myCourses(user)).stream()
                .filter(x -> courseSlug == null || courseSlug.isBlank() || x.getCourse().getSlug().equals(courseSlug))
                .filter(x -> qt == null || x.getType() == qt)
                .filter(x -> term.isEmpty() || x.getText().toLowerCase(Locale.ROOT).contains(term))
                .map(mapper::question).toList();
    }

    @Transactional(noRollbackFor = ApiException.class)
    public QuestionDto saveQuestion(User user, Long id, QuestionRequest r) {
        Question q = id == null ? new Question()
                : questions.findById(id).orElseThrow(() -> ApiException.notFound("Question introuvable."));
        if (id != null) owned(user, q.getCourse().getId());
        Course course = owned(user, r.courseId());
        q.setCourse(course);
        CourseModule module = null;
        if (r.moduleId() != null) {
            module = modules.findById(r.moduleId()).filter(m -> m.getCourse().getId().equals(course.getId()))
                    .orElseThrow(() -> ApiException.badRequest("Ce module n'appartient pas à la formation."));
        }
        q.setModule(module);
        QuestionType type = Codes.require(QuestionType.class, r.type(), "type");
        q.setType(type);
        q.setText(r.text().trim());
        q.setPoints(r.points());
        List<String> options = clean(r.options());
        List<Integer> correct = r.correct() == null ? List.of() : r.correct().stream().distinct().sorted().toList();
        switch (type) {
            case UNIQUE, MULTIPLE -> {
                if (options.size() < 2) throw ApiException.badRequest("Proposez au moins deux réponses.");
                if (correct.isEmpty() || correct.stream().anyMatch(i -> i < 0 || i >= options.size())) {
                    throw ApiException.badRequest("Indiquez la ou les bonnes réponses.");
                }
                if (type == QuestionType.UNIQUE && correct.size() != 1) throw ApiException.badRequest("Une seule bonne réponse est attendue.");
                q.setOptions(options);
                q.setCorrectAnswers(correct);
                q.setAcceptedAnswers(List.of());
            }
            case VRAIFAUX -> {
                if (correct.size() != 1 || correct.get(0) > 1) throw ApiException.badRequest("Indiquez si l'affirmation est vraie ou fausse.");
                q.setOptions(List.of("Vrai", "Faux"));
                q.setCorrectAnswers(correct);
                q.setAcceptedAnswers(List.of());
            }
            case COURTE -> {
                List<String> accepted = clean(r.accepted());
                if (accepted.isEmpty()) throw ApiException.badRequest("Indiquez au moins une réponse acceptée.");
                q.setOptions(List.of());
                q.setCorrectAnswers(List.of());
                q.setAcceptedAnswers(accepted);
            }
        }
        if (module != null && type != QuestionType.UNIQUE && type != QuestionType.VRAIFAUX) {
            throw ApiException.badRequest("Les quiz de module acceptent les QCM à réponse unique et les vrai / faux.");
        }
        return mapper.question(questions.save(q));
    }

    @Transactional
    public void deleteQuestion(User user, Long id) {
        Question q = questions.findById(id).orElseThrow(() -> ApiException.notFound("Question introuvable."));
        owned(user, q.getCourse().getId());
        exams.findByCourse(q.getCourse()).ifPresent(e -> e.getQuestions().remove(q));
        questions.delete(q);
    }

    // ------------------------------------------------------------ Apprenants et corrections

    @Transactional(readOnly = true)
    public List<TrainerLearnerDto> learners(User user, String courseSlug) {
        List<Course> mine = myCourses(user).stream()
                .filter(c -> courseSlug == null || courseSlug.isBlank() || c.getSlug().equals(courseSlug)).toList();
        List<ExamAttempt> all = attempts.findByExam_CourseIn(mine);
        List<TrainerLearnerDto> result = new ArrayList<>();
        for (Enrollment e : enrollments.findByCourseIn(mine)) {
            if (e.getStatus() == EnrollmentStatus.REFUSE) continue;
            User u = e.getUser();
            List<ExamAttempt> mineAttempts = all.stream()
                    .filter(a -> a.getUser().getId().equals(u.getId()) && a.getExam().getCourse().getId().equals(e.getCourse().getId()))
                    .toList();
            Integer best = mineAttempts.stream().filter(a -> a.getScore() != null).map(ExamAttempt::getScore)
                    .max(Integer::compare).orElse(null);
            result.add(new TrainerLearnerDto(u.getId(), e.getId(), u.fullName(), Codes.of(u.getProfileType()), u.getCenterName(),
                    Texts.display(u.getPhone()), mapper.courseRef(e.getCourse()), Codes.of(e.getMode()), learning.progressOf(u, e.getCourse()),
                    best, (int) mineAttempts.stream().filter(a -> a.getStatus() == AttemptStatus.SOUMIS).count(),
                    mineAttempts.stream().mapToInt(ExamAttempt::getTabSwitches).sum(),
                    Codes.of(e.getStatus() == EnrollmentStatus.ACTIF ? u.getStatus() : AccountStatus.EN_ATTENTE),
                    e.getEnrolledAt()));
        }
        return result;
    }

    // ------------------------------------------------------------ Modalité (en salle / en ligne)

    /** Le formateur de la formation (ou l'administrateur) change la modalité d'un apprenant. */
    @Transactional
    public String setMode(User user, Long enrollmentId, String mode) {
        Enrollment e = enrollments.findById(enrollmentId).orElseThrow(() -> ApiException.notFound("Inscription introuvable."));
        owned(user, e.getCourse().getId());
        LearningMode m = Codes.require(LearningMode.class, mode, "modalité");
        if (m != e.getMode()) {
            e.setMode(m);
            notifications.notify(e.getUser(), NotificationType.COURSE,
                    m == LearningMode.SALLE ? "Formation suivie en salle" : "Formation suivie en ligne",
                    m == LearningMode.SALLE
                            ? "Vous suivez « " + e.getCourse().getTitle() + " » à l'Académie : l'examen final aura lieu lors d'une session programmée par votre formateur."
                            : "Vous suivez « " + e.getCourse().getTitle() + " » en ligne : l'examen final s'ouvre dès que vous avez terminé tous les modules.",
                    "/apprendre/" + e.getCourse().getSlug());
        }
        return Codes.of(m);
    }

    // ------------------------------------------------------------ Sessions d'examen en salle

    private Exam examOf(User user, Long courseId) {
        Course c = owned(user, courseId);
        return exams.findByCourse(c).orElseThrow(() -> ApiException.badRequest("Configurez d'abord l'examen final (questions et réglages)."));
    }

    @Transactional(readOnly = true)
    public List<SessionDto> sessions(User user, Long courseId) {
        Course c = owned(user, courseId);
        return exams.findByCourse(c).map(e -> sessions.findByExamOrderByStartsAtAsc(e).stream().map(mapper::session).toList())
                .orElse(List.of());
    }

    @Transactional
    public SessionDto createSession(User user, Long courseId, SessionRequest r) {
        Exam exam = examOf(user, courseId);
        if (exam.getQuestions().isEmpty()) throw ApiException.badRequest("Ajoutez des questions à l'examen avant de programmer une session.");
        Instant start = r.date().atTime(r.start()).atZone(Mapper.ZONE).toInstant();
        Instant end = r.date().atTime(r.end()).atZone(Mapper.ZONE).toInstant();
        if (!end.isAfter(start)) throw ApiException.badRequest("L'heure de fin doit suivre l'heure de début.");
        if (Duration.between(start, end).toMinutes() < exam.getDurationMin()) {
            throw ApiException.badRequest("Le créneau doit durer au moins la durée de l'examen (" + exam.getDurationMin() + " min).");
        }
        if (end.isBefore(Instant.now())) throw ApiException.badRequest("Ce créneau est déjà passé.");
        ExamSession s = new ExamSession();
        s.setExam(exam);
        s.setStartsAt(start);
        s.setEndsAt(end);
        sessions.save(s);
        // Les apprenants en salle sont prévenus de la date de l'examen
        List<User> room = enrollments.findByCourseIn(List.of(exam.getCourse())).stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIF && e.getMode() == LearningMode.SALLE)
                .map(Enrollment::getUser).toList();
        notifications.notifyAll(room, NotificationType.EXAM, "Examen final programmé",
                "Examen « " + exam.getCourse().getTitle() + " » le " + Mapper.when(start) + " (jusqu'à "
                        + Mapper.hour(end) + "). Une seule tentative : soyez à l'heure.", "/apprenant/examens");
        return mapper.session(s);
    }

    @Transactional
    public void deleteSession(User user, Long sessionId) {
        ExamSession s = sessions.findById(sessionId).orElseThrow(() -> ApiException.notFound("Session introuvable."));
        owned(user, s.getExam().getCourse().getId());
        if (!s.getStartsAt().isAfter(Instant.now())) throw ApiException.badRequest("Une session commencée ou passée ne peut pas être supprimée.");
        sessions.delete(s);
    }
}
