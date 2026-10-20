package tg.cdej.aluni.service;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.common.Codes;
import tg.cdej.aluni.config.AppProperties;
import tg.cdej.aluni.domain.AttemptStatus;
import tg.cdej.aluni.domain.CertType;
import tg.cdej.aluni.domain.Certificate;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.Enrollment;
import tg.cdej.aluni.domain.EnrollmentStatus;
import tg.cdej.aluni.domain.Exam;
import tg.cdej.aluni.domain.ExamAttempt;
import tg.cdej.aluni.domain.NotificationType;
import tg.cdej.aluni.domain.Question;
import tg.cdej.aluni.domain.QuestionType;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.ExamDtos.AttemptOption;
import tg.cdej.aluni.dto.ExamDtos.AttemptQuestion;
import tg.cdej.aluni.dto.ExamDtos.AttemptResult;
import tg.cdej.aluni.dto.ExamDtos.AttemptRow;
import tg.cdej.aluni.dto.ExamDtos.AttemptState;
import tg.cdej.aluni.dto.ExamDtos.CertificateRef;
import tg.cdej.aluni.dto.ExamDtos.Correction;
import tg.cdej.aluni.dto.ExamDtos.MyExam;
import tg.cdej.aluni.dto.ExamDtos.SaveRequest;
import tg.cdej.aluni.dto.ExamDtos.SaveResponse;
import tg.cdej.aluni.repository.CertificateRepository;
import tg.cdej.aluni.repository.EnrollmentRepository;
import tg.cdej.aluni.repository.ExamAttemptRepository;
import tg.cdej.aluni.repository.ExamRepository;
import tg.cdej.aluni.repository.QuestionRepository;

@Service
public class ExamService {

    /** Délai de grâce après la fin du chronomètre (latence réseau). */
    private static final Duration GRACE = Duration.ofSeconds(30);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ExamRepository exams;
    private final ExamAttemptRepository attempts;
    private final QuestionRepository questions;
    private final EnrollmentRepository enrollments;
    private final CertificateRepository certificates;
    private final CertificateService certificateService;
    private final NotificationService notifications;
    private final LearningService learning;
    private final Mapper mapper;
    private final AppProperties props;

    public ExamService(ExamRepository exams, ExamAttemptRepository attempts, QuestionRepository questions,
            EnrollmentRepository enrollments, CertificateRepository certificates,
            CertificateService certificateService, NotificationService notifications, LearningService learning,
            Mapper mapper, AppProperties props) {
        this.exams = exams;
        this.attempts = attempts;
        this.questions = questions;
        this.enrollments = enrollments;
        this.certificates = certificates;
        this.certificateService = certificateService;
        this.notifications = notifications;
        this.learning = learning;
        this.mapper = mapper;
        this.props = props;
    }

    // ------------------------------------------------------------ Liste des examens de l'apprenant

    @Transactional(readOnly = true)
    public List<MyExam> myExams(User user) {
        List<MyExam> result = new ArrayList<>();
        for (Enrollment e : enrollments.findByUserOrderByEnrolledAtDesc(user)) {
            if (e.getStatus() != EnrollmentStatus.ACTIF || !e.getCourse().delivers(CertType.COMPETENCE)) continue;
            exams.findByCourse(e.getCourse()).ifPresent(exam -> {
                List<ExamAttempt> list = attempts.findByExamAndUserOrderByNumberAsc(exam, user);
                long submitted = list.stream().filter(a -> a.getStatus() == AttemptStatus.SOUMIS).count();
                boolean passed = list.stream().anyMatch(a -> Boolean.TRUE.equals(a.getPassed()));
                Long inProgress = list.stream().filter(a -> a.getStatus() == AttemptStatus.EN_COURS)
                        .map(ExamAttempt::getId).findFirst().orElse(null);
                String code = certificates.findByUserAndCourseAndType(user, exam.getCourse(), CertType.COMPETENCE)
                        .map(Certificate::getCode).orElse(null);
                result.add(new MyExam(mapper.exam(exam), list.stream().map(ExamService::row).toList(),
                        (int) Math.max(0, exam.getAttemptsAllowed() - submitted), passed, inProgress,
                        learning.progressOf(user, exam.getCourse()), code));
            });
        }
        return result;
    }

    static AttemptRow row(ExamAttempt a) {
        return new AttemptRow(a.getId(), a.getNumber(), a.getScore(), a.getPassed(), a.getSubmittedAt(),
                Codes.of(a.getStatus()), a.getTabSwitches());
    }

    // ------------------------------------------------------------ Démarrer / reprendre

    @Transactional(noRollbackFor = ApiException.class)
    public AttemptState start(User user, Long examId, String ip) {
        Exam exam = exams.findById(examId).orElseThrow(() -> ApiException.notFound("Examen introuvable."));
        Course course = exam.getCourse();
        enrollments.findByUserAndCourse(user, course)
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIF)
                .orElseThrow(() -> ApiException.forbidden("Vous devez être inscrit à la formation pour passer cet examen."));
        if (exam.isRoomOnly() && !fromRoom(ip)) {
            throw ApiException.forbidden("Cet examen ne peut être passé que depuis les postes de la salle de l'Académie.");
        }

        ExamAttempt current = attempts.findFirstByExamAndUserAndStatus(exam, user, AttemptStatus.EN_COURS).orElse(null);
        if (current != null && Instant.now().isAfter(current.getEndsAt().plus(GRACE))) {
            finalizeAttempt(current);
            current = null;
        }
        if (current != null) {
            // Reprise (coupure internet ou courant) : la nouvelle session remplace l'ancienne
            current.setSessionToken(UUID.randomUUID().toString());
            current.setIpAddress(ip);
            return state(current, true);
        }

        if (!exam.isOpen(LocalDate.now())) throw ApiException.badRequest("Cet examen n'est pas ouvert actuellement.");
        List<ExamAttempt> previous = attempts.findByExamAndUserOrderByNumberAsc(exam, user);
        if (previous.stream().anyMatch(a -> Boolean.TRUE.equals(a.getPassed()))) {
            throw ApiException.badRequest("Vous avez déjà réussi cet examen.");
        }
        if (previous.size() >= exam.getAttemptsAllowed()) throw ApiException.badRequest("Vous avez utilisé toutes vos tentatives.");

        List<Question> pool = exam.getQuestions().stream().filter(q -> q.getType() != QuestionType.PRATIQUE)
                .collect(Collectors.toCollection(ArrayList::new));
        if (pool.isEmpty()) throw ApiException.badRequest("Cet examen ne contient pas encore de questions.");
        Random random = new Random(RANDOM.nextLong());
        if (exam.isRandomize()) Collections.shuffle(pool, random);
        List<Question> drawn = pool.subList(0, Math.min(exam.getQuestionCount(), pool.size()));

        ExamAttempt a = new ExamAttempt();
        a.setExam(exam);
        a.setUser(user);
        a.setNumber(previous.size() + 1);
        a.setStatus(AttemptStatus.EN_COURS);
        a.setStartedAt(Instant.now());
        a.setEndsAt(Instant.now().plus(Duration.ofMinutes(exam.getDurationMin())));
        a.setSessionToken(UUID.randomUUID().toString());
        a.setIpAddress(ip);
        a.setQuestionIds(drawn.stream().map(Question::getId).toList());
        Map<String, List<Integer>> orders = new HashMap<>();
        for (Question q : drawn) {
            List<Integer> order = IntStream.range(0, q.getOptions().size()).boxed().collect(Collectors.toList());
            if (exam.isRandomize() && q.getType() != QuestionType.VRAIFAUX) Collections.shuffle(order, random);
            orders.put(String.valueOf(q.getId()), order);
        }
        a.setOptionOrders(orders);
        attempts.save(a);
        return state(a, false);
    }

    private boolean fromRoom(String ip) {
        return ip != null && props.examRoomIpPrefixes().stream().anyMatch(p -> !p.isBlank() && ip.startsWith(p.trim()));
    }

    private Map<Long, Question> questionsOf(ExamAttempt a) {
        return questions.findAllById(a.getQuestionIds()).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
    }

    private AttemptState state(ExamAttempt a, boolean resumed) {
        Map<Long, Question> byId = questionsOf(a);
        List<AttemptQuestion> qs = a.getQuestionIds().stream().map(byId::get).filter(q -> q != null).map(q -> {
            List<Integer> order = a.getOptionOrders().getOrDefault(String.valueOf(q.getId()), List.of());
            List<AttemptOption> options = order.stream().map(i -> new AttemptOption(i, q.getOptions().get(i))).toList();
            return new AttemptQuestion(q.getId(), Codes.of(q.getType()), q.getText(), q.getPoints(), options);
        }).toList();
        return new AttemptState(a.getId(), a.getSessionToken(), mapper.exam(a.getExam()), a.getEndsAt().toEpochMilli(),
                Instant.now().toEpochMilli(), qs, a.getAnswers(), a.getCurrentIndex(), a.getFlagged(),
                a.getTabSwitches(), a.getNumber(), resumed);
    }

    // ------------------------------------------------------------ Pendant l'examen

    private ExamAttempt running(User user, Long attemptId, String token) {
        ExamAttempt a = attempts.findById(attemptId).filter(x -> x.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> ApiException.notFound("Tentative introuvable."));
        if (a.getStatus() != AttemptStatus.EN_COURS) throw new ApiException(HttpStatus.GONE, "Cet examen est déjà terminé.");
        if (token == null || !token.equals(a.getSessionToken())) {
            throw ApiException.conflict("Cet examen a été ouvert dans une autre fenêtre ou sur un autre appareil. Une seule session active est autorisée.");
        }
        if (Instant.now().isAfter(a.getEndsAt().plus(GRACE))) {
            finalizeAttempt(a);
            throw new ApiException(HttpStatus.GONE, "Le temps est écoulé : vos réponses ont été envoyées.");
        }
        return a;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public SaveResponse save(User user, Long attemptId, String token, SaveRequest req) {
        ExamAttempt a = running(user, attemptId, token);
        Set<Long> allowed = new HashSet<>(a.getQuestionIds());
        if (req.answers() != null) {
            Map<String, Object> clean = new LinkedHashMap<>();
            req.answers().forEach((key, value) -> {
                try {
                    if (!allowed.contains(Long.valueOf(key)) || value == null) return;
                } catch (NumberFormatException e) {
                    return;
                }
                if (value instanceof String s) clean.put(key, s.length() > 500 ? s.substring(0, 500) : s);
                else if (value instanceof List<?> list) {
                    clean.put(key, list.stream().filter(Number.class::isInstance).map(n -> ((Number) n).intValue())
                            .distinct().limit(20).toList());
                }
            });
            a.setAnswers(clean);
        }
        if (req.currentIndex() != null) a.setCurrentIndex(Math.max(0, Math.min(req.currentIndex(), a.getQuestionIds().size() - 1)));
        if (req.flagged() != null) a.setFlagged(req.flagged().stream().filter(allowed::contains).distinct().toList());
        a.setLastSavedAt(Instant.now());
        return new SaveResponse(a.getLastSavedAt(), a.getEndsAt().toEpochMilli());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public int recordEvent(User user, Long attemptId, String token, String type) {
        ExamAttempt a = running(user, attemptId, token);
        if ("tab-switch".equals(type)) a.setTabSwitches(a.getTabSwitches() + 1);
        return a.getTabSwitches();
    }

    @Transactional(noRollbackFor = ApiException.class)
    public AttemptResult submit(User user, Long attemptId, String token) {
        ExamAttempt a = attempts.findById(attemptId).filter(x -> x.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> ApiException.notFound("Tentative introuvable."));
        if (a.getStatus() == AttemptStatus.EN_COURS) {
            if (token == null || !token.equals(a.getSessionToken())) {
                throw ApiException.conflict("Cet examen a été ouvert dans une autre fenêtre ou sur un autre appareil.");
            }
            finalizeAttempt(a);
        }
        return result(a);
    }

    @Transactional(readOnly = true)
    public AttemptResult result(User user, Long attemptId) {
        ExamAttempt a = attempts.findById(attemptId).filter(x -> x.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> ApiException.notFound("Tentative introuvable."));
        if (a.getStatus() != AttemptStatus.SOUMIS) throw ApiException.badRequest("Cet examen n'est pas terminé.");
        return result(a);
    }

    // ------------------------------------------------------------ Correction

    private static String fold(String s) {
        return Normalizer.normalize(s == null ? "" : s.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private static Set<Integer> chosen(Object value) {
        if (!(value instanceof List<?> list)) return Set.of();
        return list.stream().filter(Number.class::isInstance).map(n -> ((Number) n).intValue()).collect(Collectors.toSet());
    }

    static boolean isCorrect(Question q, Object answer) {
        if (answer == null) return false;
        if (q.getType() == QuestionType.COURTE) {
            String given = fold(String.valueOf(answer));
            return !given.isEmpty() && q.getAcceptedAnswers().stream().anyMatch(x -> fold(x).equals(given));
        }
        Set<Integer> given = chosen(answer);
        return !given.isEmpty() && given.equals(new HashSet<>(q.getCorrectAnswers()));
    }

    /** Corrige, enregistre la note et délivre le certificat en cas de réussite. */
    @Transactional
    public void finalizeAttempt(ExamAttempt a) {
        if (a.getStatus() == AttemptStatus.SOUMIS) return;
        Map<Long, Question> byId = questionsOf(a);
        int total = 0;
        int earned = 0;
        for (Long id : a.getQuestionIds()) {
            Question q = byId.get(id);
            if (q == null) continue;
            total += q.getPoints();
            if (isCorrect(q, a.getAnswers().get(String.valueOf(id)))) earned += q.getPoints();
        }
        Exam exam = a.getExam();
        int score = total == 0 ? 0 : Math.round(earned * 100f / total);
        a.setScore(score);
        a.setPassed(score >= exam.getPassMark());
        a.setStatus(AttemptStatus.SOUMIS);
        a.setSubmittedAt(Instant.now());
        a.setSessionToken(null);
        attempts.save(a);

        Course course = exam.getCourse();
        if (a.getPassed() && course.delivers(CertType.COMPETENCE)) {
            certificateService.issue(a.getUser(), course, CertType.COMPETENCE, score, exam.isRequiresAdminValidation());
        }
        if (a.getTabSwitches() > 0) {
            notifications.notify(course.getTrainer(), NotificationType.EXAM, "Alerte anti-fraude",
                    a.getUser().fullName() + " a changé d'onglet " + a.getTabSwitches() + " fois pendant l'examen « "
                            + exam.getTitle() + " ».", "/formateur/apprenants");
        }
    }

    private AttemptResult result(ExamAttempt a) {
        Exam exam = a.getExam();
        long submitted = attempts.findByExamAndUserOrderByNumberAsc(exam, a.getUser()).stream()
                .filter(x -> x.getStatus() == AttemptStatus.SOUMIS).count();
        CertificateRef cert = certificates.findByUserAndCourseAndType(a.getUser(), exam.getCourse(), CertType.COMPETENCE)
                .filter(c -> Boolean.TRUE.equals(a.getPassed()))
                .map(c -> new CertificateRef(c.getCode(), Codes.of(c.getStatus()))).orElse(null);
        List<Correction> corrections = null;
        if (exam.isShowCorrection()) {
            Map<Long, Question> byId = questionsOf(a);
            corrections = a.getQuestionIds().stream().map(byId::get).filter(q -> q != null).map(q -> {
                Object answer = a.getAnswers().get(String.valueOf(q.getId()));
                boolean ok = isCorrect(q, answer);
                return new Correction(q.getId(), q.getText(), Codes.of(q.getType()), q.getPoints(), ok ? q.getPoints() : 0,
                        ok, display(q, answer), expected(q));
            }).toList();
        }
        return new AttemptResult(a.getId(), a.getScore() == null ? 0 : a.getScore(), Boolean.TRUE.equals(a.getPassed()),
                exam.getPassMark(), (int) Math.max(0, exam.getAttemptsAllowed() - submitted), cert, corrections,
                exam.getCourse().getSlug(), exam.getTitle());
    }

    private static String display(Question q, Object answer) {
        if (answer == null) return null;
        if (q.getType() == QuestionType.COURTE) return String.valueOf(answer);
        String text = chosen(answer).stream().sorted().filter(i -> i >= 0 && i < q.getOptions().size())
                .map(q.getOptions()::get).collect(Collectors.joining(", "));
        return text.isEmpty() ? null : text;
    }

    private static String expected(Question q) {
        if (q.getType() == QuestionType.COURTE) return q.getAcceptedAnswers().isEmpty() ? "" : q.getAcceptedAnswers().get(0);
        return q.getCorrectAnswers().stream().filter(i -> i >= 0 && i < q.getOptions().size()).map(q.getOptions()::get)
                .collect(Collectors.joining(", "));
    }

    /** Soumet automatiquement les examens dont le temps est écoulé (appelé périodiquement). */
    @Transactional
    public int finalizeExpired() {
        List<ExamAttempt> expired = attempts.findByStatusAndEndsAtBefore(AttemptStatus.EN_COURS, Instant.now().minus(GRACE));
        expired.forEach(this::finalizeAttempt);
        return expired.size();
    }
}
