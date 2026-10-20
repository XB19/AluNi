package tg.cdej.aluni.seed;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import javax.imageio.ImageIO;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import tg.cdej.aluni.config.AppProperties;
import tg.cdej.aluni.domain.AccessMode;
import tg.cdej.aluni.domain.AccountStatus;
import tg.cdej.aluni.domain.AttemptStatus;
import tg.cdej.aluni.domain.Category;
import tg.cdej.aluni.domain.CertType;
import tg.cdej.aluni.domain.Certificate;
import tg.cdej.aluni.domain.CertificateStatus;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.CourseModule;
import tg.cdej.aluni.domain.CourseStatus;
import tg.cdej.aluni.domain.Enrollment;
import tg.cdej.aluni.domain.EnrollmentStatus;
import tg.cdej.aluni.domain.Exam;
import tg.cdej.aluni.domain.ExamAttempt;
import tg.cdej.aluni.domain.FaqItem;
import tg.cdej.aluni.domain.Lesson;
import tg.cdej.aluni.domain.LessonProgress;
import tg.cdej.aluni.domain.LessonType;
import tg.cdej.aluni.domain.Level;
import tg.cdej.aluni.domain.News;
import tg.cdej.aluni.domain.Notification;
import tg.cdej.aluni.domain.NotificationType;
import tg.cdej.aluni.domain.Partner;
import tg.cdej.aluni.domain.ProfileType;
import tg.cdej.aluni.domain.Question;
import tg.cdej.aluni.domain.QuestionType;
import tg.cdej.aluni.domain.QuizResult;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.Submission;
import tg.cdej.aluni.domain.SubmissionStatus;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.repository.CategoryRepository;
import tg.cdej.aluni.repository.CertificateRepository;
import tg.cdej.aluni.repository.CourseRepository;
import tg.cdej.aluni.repository.EnrollmentRepository;
import tg.cdej.aluni.repository.ExamAttemptRepository;
import tg.cdej.aluni.repository.ExamRepository;
import tg.cdej.aluni.repository.FaqItemRepository;
import tg.cdej.aluni.repository.LessonProgressRepository;
import tg.cdej.aluni.repository.NewsRepository;
import tg.cdej.aluni.repository.NotificationRepository;
import tg.cdej.aluni.repository.PartnerRepository;
import tg.cdej.aluni.repository.QuestionRepository;
import tg.cdej.aluni.repository.QuizResultRepository;
import tg.cdej.aluni.repository.SubmissionRepository;
import tg.cdej.aluni.repository.UserRepository;
import tg.cdej.aluni.service.CertificateService;
import tg.cdej.aluni.service.StorageService;

/**
 * Données de démonstration chargées au premier démarrage (base vide).
 * À désactiver en production avec SEED_DEMO_DATA=false.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final AppProperties props;
    private final TransactionTemplate tx;
    private final PasswordEncoder encoder;
    private final UserRepository users;
    private final CategoryRepository categories;
    private final CourseRepository courses;
    private final QuestionRepository questions;
    private final ExamRepository exams;
    private final EnrollmentRepository enrollments;
    private final LessonProgressRepository progress;
    private final QuizResultRepository quizResults;
    private final ExamAttemptRepository attempts;
    private final CertificateRepository certificates;
    private final CertificateService certificateService;
    private final NotificationRepository notifications;
    private final SubmissionRepository submissions;
    private final NewsRepository news;
    private final PartnerRepository partners;
    private final FaqItemRepository faq;
    private final StorageService storage;

    private final Random random = new Random(2026);
    private String passwordHash;

    public DemoDataSeeder(AppProperties props, TransactionTemplate tx, PasswordEncoder encoder, UserRepository users,
            CategoryRepository categories, CourseRepository courses, QuestionRepository questions,
            ExamRepository exams, EnrollmentRepository enrollments, LessonProgressRepository progress,
            QuizResultRepository quizResults, ExamAttemptRepository attempts, CertificateRepository certificates,
            CertificateService certificateService, NotificationRepository notifications,
            SubmissionRepository submissions, NewsRepository news, PartnerRepository partners, FaqItemRepository faq,
            StorageService storage) {
        this.props = props;
        this.tx = tx;
        this.encoder = encoder;
        this.users = users;
        this.categories = categories;
        this.courses = courses;
        this.questions = questions;
        this.exams = exams;
        this.enrollments = enrollments;
        this.progress = progress;
        this.quizResults = quizResults;
        this.attempts = attempts;
        this.certificates = certificates;
        this.certificateService = certificateService;
        this.notifications = notifications;
        this.submissions = submissions;
        this.news = news;
        this.partners = partners;
        this.faq = faq;
        this.storage = storage;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!props.seedDemoData() || categories.count() > 0) return;
        tx.executeWithoutResult(status -> seed());
        log.info("Données de démonstration chargées (comptes : coordination@aluni.tg, koffi@aluni.tg, kossi@exemple.tg).");
    }

    // ------------------------------------------------------------ Outils

    private static Instant at(String date) {
        return LocalDate.parse(date).atTime(9, 0).toInstant(ZoneOffset.UTC);
    }

    private User user(String first, String last, String phone, String email, Role role, ProfileType profile,
            String center, String gender, String birth, String created) {
        User u = new User();
        u.setFirstName(first);
        u.setLastName(last);
        u.setPhone(phone);
        u.setEmail(email);
        u.setRole(role);
        u.setProfileType(profile);
        u.setCenterName(center);
        u.setGender(gender);
        u.setBirthDate(birth == null ? null : LocalDate.parse(birth));
        u.setPasswordHash(passwordHash);
        u.setStatus(AccountStatus.ACTIF);
        u.setCreatedAt(at(created));
        return users.save(u);
    }

    private User trainer(String first, String last, String phone, String email, String title, String bio) {
        User u = user(first, last, phone, email, Role.FORMATEUR, null, null, null, null, "2026-01-05");
        u.setTitle(title);
        u.setSpeciality(title);
        u.setBio(bio);
        return u;
    }

    private record L(String title, LessonType type, String duration, boolean practical) {
    }

    private static L l(String title) {
        return new L(title, LessonType.TEXTE, "10 min", false);
    }

    private static L l(String title, LessonType type, String duration) {
        return new L(title, type, duration, false);
    }

    private static L tp(String title, String duration) {
        return new L(title, LessonType.TEXTE, duration, true);
    }

    private record M(String title, List<L> lessons) {
    }

    private static M m(String title, L... lessons) {
        return new M(title, List.of(lessons));
    }

    private static String content(String module, L lesson, String trainer) {
        String practical = lesson.practical()
                ? "<h3>À rendre</h3><p>Réalisez l'exercice puis déposez votre fichier ci-dessous (photo, capture d'écran ou document). "
                        + "Votre formateur le corrigera et vous recevrez une note sur 20.</p>"
                : "";
        return "<p>Dans cette leçon du module <strong>« " + module + " »</strong>, nous allons découvrir pas à pas : <strong>"
                + lesson.title().toLowerCase() + "</strong>. Prenez votre temps, et n'hésitez pas à refaire les manipulations "
                + "sur votre ordinateur ou votre téléphone.</p>"
                + "<h2>Ce qu'il faut retenir</h2><ul><li>Chaque notion est illustrée par un exemple concret de la vie de tous les jours.</li>"
                + "<li>Les mots importants sont expliqués simplement, sans jargon inutile.</li>"
                + "<li>Un petit exercice vous permet de vérifier que vous avez compris.</li></ul>"
                + "<h3>Exercice pratique</h3><ol><li>Relisez attentivement la leçon (ou regardez la vidéo une seconde fois).</li>"
                + "<li>Reproduisez la manipulation présentée, étape par étape.</li>"
                + "<li>Notez vos questions pour les poser à votre formateur, " + trainer + ", lors de la prochaine séance en salle.</li></ol>"
                + practical
                + "<p>Quand vous êtes prêt, cliquez sur <strong>« Marquer comme terminée »</strong> pour enregistrer votre progression.</p>";
    }

    private Course course(String slug, String title, Category cat, Level level, int hours, int weeks, User trainer,
            List<CertType> certs, AccessMode access, double rating, boolean popular, boolean isNew, String shortDesc,
            String description, List<String> prereq, List<String> objectives, List<String> skills, List<M> modules,
            CourseStatus status, String created) {
        Course c = new Course();
        c.setSlug(slug);
        c.setTitle(title);
        c.setCategory(cat);
        c.setLevel(level);
        c.setHours(hours);
        c.setWeeks(weeks);
        c.setTrainer(trainer);
        c.setCertTypes(new ArrayList<>(certs.stream().map(Enum::name).toList()));
        c.setAccess(access);
        c.setRating(rating);
        c.setPopular(popular);
        c.setFeaturedNew(isNew);
        c.setShortDescription(shortDesc);
        c.setDescription(description);
        c.setPrerequisites(new ArrayList<>(prereq));
        c.setObjectives(new ArrayList<>(objectives));
        c.setSkills(new ArrayList<>(skills));
        c.setStatus(status);
        c.setCreatedAt(at(created));
        if (status == CourseStatus.EN_VALIDATION) c.setSubmittedAt(Instant.now().minusSeconds(86400L * 3));
        for (int i = 0; i < modules.size(); i++) {
            M md = modules.get(i);
            CourseModule cm = new CourseModule();
            cm.setCourse(c);
            cm.setPosition(i);
            cm.setTitle(md.title());
            for (int j = 0; j < md.lessons().size(); j++) {
                L ld = md.lessons().get(j);
                Lesson ls = new Lesson();
                ls.setModule(cm);
                ls.setPosition(j);
                ls.setTitle(ld.title());
                ls.setType(ld.type());
                ls.setDuration(ld.duration());
                ls.setPractical(ld.practical());
                ls.setContent(content(md.title(), ld, trainer.fullName()));
                if (ld.type() == LessonType.VIDEO) ls.setVideoUrl("https://www.youtube.com/embed/WuzpUUxvnBk");
                cm.getLessons().add(ls);
            }
            c.getModules().add(cm);
        }
        return courses.save(c);
    }

    private Question question(Course c, CourseModule module, QuestionType type, String text, List<String> options,
            List<Integer> correct, List<String> accepted, int points) {
        Question q = new Question();
        q.setCourse(c);
        q.setModule(module);
        q.setType(type);
        q.setText(text);
        q.setOptions(new ArrayList<>(options));
        q.setCorrectAnswers(new ArrayList<>(correct));
        q.setAcceptedAnswers(new ArrayList<>(accepted));
        q.setPoints(points);
        return questions.save(q);
    }

    private Question unique(Course c, String text, List<String> options, int correct) {
        return question(c, null, QuestionType.UNIQUE, text, options, List.of(correct), List.of(), 1);
    }

    private Question trueFalse(Course c, String text, boolean value) {
        return question(c, null, QuestionType.VRAIFAUX, text, List.of("Vrai", "Faux"), List.of(value ? 0 : 1), List.of(), 1);
    }

    private Exam exam(Course c, int duration, int count, int passMark, List<Question> qs) {
        Exam e = new Exam();
        e.setCourse(c);
        e.setTitle("Examen final – " + c.getTitle());
        e.setDurationMin(duration);
        e.setQuestionCount(count);
        e.setPassMark(passMark);
        e.setAttemptsAllowed(2);
        e.setOpensAt(LocalDate.now().minusDays(10));
        e.setClosesAt(LocalDate.now().plusDays(60));
        e.getQuestions().addAll(qs);
        return exams.save(e);
    }

    private Enrollment enroll(User u, Course c, EnrollmentStatus status, String date) {
        Enrollment e = new Enrollment();
        e.setUser(u);
        e.setCourse(c);
        e.setStatus(status);
        e.setEnrolledAt(at(date));
        return enrollments.save(e);
    }

    private List<Lesson> lessons(Course c) {
        return c.getModules().stream().flatMap(m -> m.getLessons().stream()).toList();
    }

    /** Marque les n premières leçons comme terminées. */
    private void complete(Enrollment e, int n) {
        List<Lesson> all = lessons(e.getCourse());
        for (int i = 0; i < Math.min(n, all.size()); i++) progress.save(new LessonProgress(e.getUser(), all.get(i)));
        if (n >= all.size()) e.setCompletedAt(e.getEnrolledAt().plusSeconds(86400L * (20 + random.nextInt(30))));
    }

    private void completePercent(Enrollment e, int percent) {
        complete(e, Math.round(lessons(e.getCourse()).size() * percent / 100f));
    }

    private ExamAttempt attempt(User u, Exam exam, int number, int score, int tabSwitches, Instant when) {
        ExamAttempt a = new ExamAttempt();
        a.setExam(exam);
        a.setUser(u);
        a.setNumber(number);
        a.setStatus(AttemptStatus.SOUMIS);
        a.setStartedAt(when.minusSeconds(900));
        a.setEndsAt(when.minusSeconds(900).plusSeconds(exam.getDurationMin() * 60L));
        a.setSubmittedAt(when);
        a.setQuestionIds(exam.getQuestions().stream().map(Question::getId).limit(exam.getQuestionCount()).toList());
        a.setScore(score);
        a.setPassed(score >= exam.getPassMark());
        a.setTabSwitches(tabSwitches);
        return attempts.save(a);
    }

    private Certificate certificate(String code, User u, Course c, CertType type, Integer score, String date,
            CertificateStatus status) {
        Certificate cert = new Certificate();
        cert.setCode(code);
        cert.setUser(u);
        cert.setCourse(c);
        cert.setType(type);
        cert.setHolderName(u.getFirstName() + " " + u.getLastName().toUpperCase());
        cert.setScore(score);
        cert.setMention(CertificateService.mention(score));
        cert.setIssuedAt(LocalDate.parse(date));
        cert.setStatus(status);
        cert.setSignature(certificateService.sign(cert));
        return certificates.save(cert);
    }

    private void notification(User u, NotificationType type, String title, String text, String link, String date, boolean read) {
        Notification n = new Notification();
        n.setUser(u);
        n.setType(type);
        n.setTitle(title);
        n.setText(text);
        n.setLink(link);
        n.setRead(read);
        n.setCreatedAt(at(date));
        notifications.save(n);
    }

    private String demoFile(String name, String label, Color color) {
        try {
            byte[] bytes;
            String ext = StorageService.extension(name);
            if (ext.equals("xlsx")) {
                try (XSSFWorkbook wb = new XSSFWorkbook()) {
                    var sheet = wb.createSheet("Calendrier");
                    String[] days = { "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi" };
                    for (int i = 0; i < days.length; i++) {
                        var row = sheet.createRow(i);
                        row.createCell(0).setCellValue(days[i]);
                        row.createCell(1).setCellValue("Publication produit " + (i + 1));
                    }
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    wb.write(out);
                    bytes = out.toByteArray();
                }
            } else {
                BufferedImage img = new BufferedImage(640, 400, BufferedImage.TYPE_INT_RGB);
                Graphics2D g = img.createGraphics();
                g.setColor(color);
                g.fillRect(0, 0, 640, 400);
                g.setColor(Color.WHITE);
                g.setFont(g.getFont().deriveFont(28f));
                g.drawString(label, 40, 210);
                g.dispose();
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                ImageIO.write(img, ext.equals("jpg") ? "jpg" : "png", out);
                bytes = out.toByteArray();
            }
            String relative = "submissions/demo-" + name;
            Path target = storage.publicRoot().getParent().resolve("private").resolve(relative);
            Files.createDirectories(target.getParent());
            Files.write(target, bytes);
            return relative;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private void submission(User u, Course c, Lesson lesson, String fileName, Color color, String date, Integer grade) {
        Submission s = new Submission();
        s.setUser(u);
        s.setCourse(c);
        s.setLesson(lesson);
        s.setTask(lesson.getTitle());
        s.setFileName(fileName);
        s.setStoredFile(demoFile(fileName, lesson.getTitle(), color));
        s.setSubmittedAt(at(date));
        s.setStatus(grade == null ? SubmissionStatus.A_CORRIGER : SubmissionStatus.CORRIGE);
        s.setGrade(grade);
        if (grade != null) {
            s.setComment("Très bon travail, dossiers bien organisés !");
            s.setGradedAt(at(date).plusSeconds(86400));
        }
        submissions.save(s);
    }

    private Lesson lessonByTitle(Course c, String title) {
        return lessons(c).stream().filter(x -> x.getTitle().equals(title)).findFirst().orElseThrow();
    }

    // ------------------------------------------------------------ Jeu de données

    private void seed() {
        passwordHash = encoder.encode(props.demoPassword());

        // Catégories
        String[][] cats = {
                { "bureautique", "Bureautique", "FileText", "from-sky-500 to-blue-700" },
                { "programmation", "Programmation", "Code", "from-violet-500 to-indigo-700" },
                { "design", "Design graphique", "Palette", "from-pink-500 to-rose-700" },
                { "reseaux", "Réseaux & maintenance", "Network", "from-teal-500 to-emerald-700" },
                { "internet", "Internet & sécurité", "ShieldCheck", "from-amber-500 to-orange-700" },
                { "entrepreneuriat", "Entrepreneuriat numérique", "Rocket", "from-lime-500 to-green-700" } };
        Map<String, Category> cat = new HashMap<>();
        for (int i = 0; i < cats.length; i++) {
            Category c = new Category();
            c.setSlug(cats[i][0]);
            c.setName(cats[i][1]);
            c.setIcon(cats[i][2]);
            c.setColor(cats[i][3]);
            c.setPosition(i);
            cat.put(c.getSlug(), categories.save(c));
        }

        // Comptes
        user("Abla", "Sossou", "92334455", "coordination@aluni.tg", Role.ADMIN, null, "CDEJ TG0157", "F", null, "2025-11-01");
        User koffi = trainer("Koffi", "Amegah", "91223344", "koffi@aluni.tg", "Formateur en bureautique",
                "Enseignant en informatique depuis 8 ans, il accompagne les jeunes dans leurs premiers pas avec l'ordinateur.");
        User ama = trainer("Ama", "Kpodar", "93112233", "ama@aluni.tg", "Développeuse web",
                "Développeuse freelance, elle forme les jeunes à la création de sites web et à la programmation.");
        User yao = trainer("Yao", "Mensah", "96554433", "yao@aluni.tg", "Technicien réseaux",
                "Technicien en maintenance informatique et réseaux, passionné de transmission.");
        User akossiwa = trainer("Akossiwa", "Dogbe", "97665544", "akossiwa@aluni.tg", "Graphiste & entrepreneure",
                "Graphiste et fondatrice d'une petite agence de communication à Atakpamé.");
        User senam = trainer("Sénam", "Attiogbe", "90556677", "senam.a@exemple.tg", "Infographie et vidéo", null);
        senam.setStatus(AccountStatus.EN_ATTENTE);
        senam.setCreatedAt(Instant.now().minusSeconds(86400L * 4));
        User kwami = trainer("Kwami", "Ahadji", "93214365", "kwami@exemple.tg", "Électronique et Arduino", null);
        kwami.setStatus(AccountStatus.EN_ATTENTE);
        kwami.setCreatedAt(Instant.now().minusSeconds(86400L * 2));

        String internal = "CDEJ TG0157";
        User kossi = user("Kossi", "Agbeko", "90112233", "kossi@exemple.tg", Role.APPRENANT, ProfileType.INTERNE, internal, "M", "2008-03-14", "2026-07-15");
        User essi = user("Essi", "Agbeko", "90221100", null, Role.APPRENANT, ProfileType.INTERNE, internal, "F", "2007-09-02", "2026-08-15");
        User komlan = user("Komlan", "Dzidzo", "93456789", null, Role.APPRENANT, ProfileType.AUTRE_CDEJ, "CDEJ TG0212 Atakpamé", "M", "2006-05-21", "2026-09-10");
        User afi = user("Afi", "Mensah", "97123456", "afi.mensah@exemple.tg", Role.APPRENANT, ProfileType.PARTICULIER, null, "F", "1998-12-11", "2026-07-21");
        User kodjo = user("Kodjo", "Lawson", "90987654", null, Role.APPRENANT, ProfileType.INTERNE, internal, "M", "2007-01-30", "2026-06-03");
        User mawuli = user("Mawuli", "Adjo", "92001122", null, Role.APPRENANT, ProfileType.AUTRE_CDEJ, "CDEJ TG0188 Notsé", "M", "2006-08-08", "2026-05-11");
        mawuli.setStatus(AccountStatus.SUSPENDU);
        User yawa = user("Yawa", "Kouma", "91332211", null, Role.APPRENANT, ProfileType.INTERNE, internal, "F", "2009-04-17", "2026-10-01");
        User edem = user("Edem", "Folly", "99876543", "edem.folly@exemple.tg", Role.APPRENANT, ProfileType.PARTICULIER, null, "M", "2001-02-25", "2026-08-28");

        // Formations
        List<CertType> both = List.of(CertType.ATTESTATION, CertType.COMPETENCE);
        List<CertType> comp = List.of(CertType.COMPETENCE);
        Course initiation = course("initiation-informatique", "Initiation à l'informatique", cat.get("bureautique"), Level.DEBUTANT, 20, 4, koffi,
                both, AccessMode.LIBRE, 4.8, true, false,
                "Découvrez l'ordinateur, le clavier, la souris, les fichiers et Internet. Le point de départ idéal.",
                "Cette formation s'adresse à toute personne qui n'a jamais (ou très peu) utilisé un ordinateur. Pas à pas, vous apprendrez à allumer et utiliser un ordinateur, à organiser vos fichiers, à saisir un texte et à naviguer sur Internet en toute sécurité.",
                List.of("Aucun prérequis", "Savoir lire et écrire en français"),
                List.of("Identifier les éléments d'un ordinateur et leur rôle", "Utiliser le clavier et la souris avec aisance",
                        "Créer, ranger et retrouver des dossiers et des fichiers", "Naviguer sur Internet et effectuer des recherches",
                        "Créer et utiliser une adresse e-mail"),
                List.of("Windows", "Clavier & souris", "Gestion de fichiers", "Internet", "E-mail"),
                List.of(m("Découvrir l'ordinateur", l("Qu'est-ce qu'un ordinateur ?", LessonType.VIDEO, "8 min"), l("Allumer, éteindre, redémarrer"),
                        l("Le clavier et la souris", LessonType.VIDEO, "12 min"), l("Fiche récapitulative", LessonType.PDF, "5 min")),
                        m("Fichiers et dossiers", l("Le bureau de Windows"), tp("Créer et renommer un dossier", "15 min"),
                                l("Copier, déplacer, supprimer"), l("Utiliser une clé USB")),
                        m("Internet et e-mail", l("Qu'est-ce qu'Internet ?", LessonType.VIDEO, "10 min"), l("Faire une recherche sur Google"),
                                l("Créer une adresse e-mail", LessonType.VIDEO, "15 min"), l("Envoyer un e-mail avec pièce jointe"))),
                CourseStatus.PUBLIEE, "2026-01-10");
        Course word = course("word-documents-professionnels", "Word : rédiger des documents professionnels", cat.get("bureautique"), Level.DEBUTANT, 16, 3, koffi,
                comp, AccessMode.LIBRE, 4.7, true, false,
                "Rédigez un CV, une lettre de motivation et des rapports bien présentés avec Microsoft Word.",
                "Apprenez à produire des documents clairs et soignés : mise en forme, tableaux, images, styles et mise en page. À la fin de la formation, vous aurez rédigé votre propre CV et une lettre de motivation.",
                List.of("Initiation à l'informatique ou niveau équivalent"),
                List.of("Saisir et mettre en forme un texte", "Insérer des tableaux et des images", "Utiliser les styles et la table des matières", "Rédiger un CV et une lettre de motivation"),
                List.of("Microsoft Word", "Mise en page", "CV", "Rédaction"),
                List.of(m("Les bases de Word", l("L'interface de Word", LessonType.VIDEO, "10 min"), l("Saisir et corriger un texte"), l("Mettre en forme les caractères")),
                        m("Mise en page", l("Paragraphes et alignements"), l("Insérer un tableau", LessonType.VIDEO, "10 min"), l("Insérer une image")),
                        m("Projet : mon CV", l("Les règles d'un bon CV", LessonType.PDF, "10 min"), tp("Réaliser son CV pas à pas", "20 min"), l("La lettre de motivation"))),
                CourseStatus.PUBLIEE, "2026-01-15");
        Course excel = course("excel-gestion", "Excel pour la gestion et le calcul", cat.get("bureautique"), Level.INTERMEDIAIRE, 24, 5, koffi,
                comp, AccessMode.LIBRE, 4.6, false, false,
                "Tableaux, formules, graphiques : gérez un budget ou une petite activité avec Excel.",
                "Excel est l'outil de gestion le plus utilisé au monde. Cette formation vous apprend à créer des tableaux, à automatiser des calculs avec les formules et à présenter vos chiffres avec des graphiques.",
                List.of("Initiation à l'informatique", "Notions de calcul (pourcentages)"),
                List.of("Créer et mettre en forme un tableau", "Utiliser les formules SOMME, MOYENNE, SI", "Réaliser des graphiques", "Construire un budget mensuel"),
                List.of("Microsoft Excel", "Formules", "Graphiques", "Budget"),
                List.of(m("Premiers pas", l("Cellules, lignes et colonnes", LessonType.VIDEO, "10 min"), l("Saisir et mettre en forme")),
                        m("Formules", l("Les opérations de base"), l("SOMME, MOYENNE, MIN, MAX", LessonType.VIDEO, "12 min"), l("La fonction SI")),
                        m("Graphiques et projet", l("Créer un graphique", LessonType.VIDEO, "10 min"), tp("Projet : budget mensuel", "30 min"))),
                CourseStatus.PUBLIEE, "2026-02-01");
        Course web = course("site-web-html-css", "Créer son premier site web (HTML & CSS)", cat.get("programmation"), Level.DEBUTANT, 30, 6, ama,
                comp, AccessMode.VALIDATION, 4.9, true, true,
                "Construisez une page web de A à Z et mettez-la en ligne. Aucune expérience requise.",
                "Découvrez les langages du web et réalisez votre propre site vitrine : structure avec HTML, mise en forme avec CSS, adaptation aux téléphones et mise en ligne gratuite.",
                List.of("Initiation à l'informatique", "Savoir utiliser un navigateur web"),
                List.of("Comprendre le fonctionnement d'un site web", "Structurer une page avec HTML", "Mettre en forme avec CSS", "Rendre une page adaptée au mobile", "Publier son site en ligne"),
                List.of("HTML", "CSS", "Responsive design", "Hébergement"),
                List.of(m("Comment fonctionne le web", l("Navigateur, serveur, URL", LessonType.VIDEO, "10 min"), l("Installer son éditeur de code")),
                        m("HTML", l("Les balises essentielles", LessonType.VIDEO, "15 min"), l("Titres, paragraphes, listes"), l("Liens et images"),
                                tp("Exercice : ma page de présentation", "25 min")),
                        m("CSS", l("Couleurs et polices", LessonType.VIDEO, "10 min"), l("Le modèle des boîtes"), l("Mise en page avec Flexbox", LessonType.VIDEO, "18 min")),
                        m("Mise en ligne", l("Adapter au téléphone"), l("Publier gratuitement son site", LessonType.VIDEO, "12 min"))),
                CourseStatus.PUBLIEE, "2026-03-01");
        Course python = course("python-debutants", "Programmation Python pour débutants", cat.get("programmation"), Level.INTERMEDIAIRE, 36, 8, ama,
                comp, AccessMode.VALIDATION, 4.7, false, false,
                "Apprenez à programmer avec Python, le langage le plus utilisé pour débuter.",
                "Variables, conditions, boucles, fonctions : apprenez la logique de la programmation avec Python à travers de petits projets concrets (calculatrice, jeu de devinette, gestion de notes).",
                List.of("Initiation à l'informatique", "Logique mathématique de base"),
                List.of("Écrire et exécuter un programme Python", "Utiliser variables, conditions et boucles", "Créer des fonctions", "Réaliser un mini-projet"),
                List.of("Python", "Algorithmique", "Logique"),
                List.of(m("Démarrer", l("Installer Python", LessonType.VIDEO, "10 min"), l("Mon premier programme")),
                        m("Les bases", l("Variables et types"), l("Conditions", LessonType.VIDEO, "12 min"), l("Boucles", LessonType.VIDEO, "12 min")),
                        m("Projets", l("Fonctions"), tp("Projet : jeu de devinette", "30 min"))),
                CourseStatus.PUBLIEE, "2026-03-15");
        Course design = course("design-graphique-canva", "Design graphique avec Canva et GIMP", cat.get("design"), Level.DEBUTANT, 18, 4, akossiwa,
                both, AccessMode.LIBRE, 4.8, true, false,
                "Créez affiches, logos et visuels pour les réseaux sociaux, même sans talent en dessin.",
                "Apprenez les règles de base du design (couleurs, typographie, composition) et réalisez des affiches, des flyers et des visuels pour les réseaux sociaux avec Canva et GIMP, deux outils gratuits.",
                List.of("Initiation à l'informatique"),
                List.of("Comprendre les principes du design", "Créer une affiche avec Canva", "Retoucher une photo avec GIMP", "Concevoir une identité visuelle simple"),
                List.of("Canva", "GIMP", "Typographie", "Couleurs"),
                List.of(m("Les bases du design", l("Couleurs et contrastes", LessonType.VIDEO, "10 min"), l("Choisir ses polices"), l("Composer une affiche")),
                        m("Canva", l("Prise en main", LessonType.VIDEO, "10 min"), tp("Créer une affiche d'événement", "20 min")),
                        m("GIMP", l("Recadrer et retoucher", LessonType.VIDEO, "12 min"), l("Détourer une image"))),
                CourseStatus.PUBLIEE, "2026-02-10");
        Course maintenance = course("maintenance-reseaux", "Maintenance informatique et réseaux", cat.get("reseaux"), Level.INTERMEDIAIRE, 32, 6, yao,
                comp, AccessMode.VALIDATION, 4.6, false, false,
                "Diagnostiquez les pannes, installez Windows et montez un petit réseau local.",
                "Formation pratique en salle : démontage d'un ordinateur, installation d'un système d'exploitation, diagnostic des pannes courantes et configuration d'un réseau local avec partage Internet.",
                List.of("Initiation à l'informatique", "Présence en salle pour les travaux pratiques"),
                List.of("Identifier les composants d'un ordinateur", "Installer et configurer Windows", "Diagnostiquer les pannes courantes", "Configurer un petit réseau local"),
                List.of("Matériel", "Windows", "Dépannage", "Réseau local"),
                List.of(m("Le matériel", l("Les composants", LessonType.VIDEO, "12 min"), tp("Démonter un ordinateur (TP)", "45 min")),
                        m("Système", l("Installer Windows", LessonType.VIDEO, "25 min"), l("Pilotes et mises à jour")),
                        m("Réseaux", l("Adresse IP et routeur"), l("Partager une connexion", LessonType.VIDEO, "12 min"))),
                CourseStatus.PUBLIEE, "2026-04-01");
        Course securite = course("securite-en-ligne", "Sécurité en ligne et citoyenneté numérique", cat.get("internet"), Level.DEBUTANT, 8, 2, yao,
                List.of(CertType.ATTESTATION), AccessMode.LIBRE, 4.9, false, true,
                "Protégez vos comptes, repérez les arnaques et adoptez un bon comportement sur Internet.",
                "Mots de passe, arnaques par SMS et WhatsApp, fausses informations, réputation en ligne et respect des autres : tout ce qu'il faut savoir pour utiliser Internet en sécurité.",
                List.of("Aucun prérequis"),
                List.of("Créer des mots de passe solides", "Reconnaître les arnaques", "Vérifier une information", "Protéger sa vie privée"),
                List.of("Mots de passe", "Arnaques", "Vie privée", "Esprit critique"),
                List.of(m("Protéger ses comptes", l("Les mots de passe", LessonType.VIDEO, "10 min"), l("La double authentification")),
                        m("Rester vigilant", l("Arnaques courantes", LessonType.VIDEO, "10 min"), l("Fausses informations"), l("Mon image en ligne"))),
                CourseStatus.PUBLIEE, "2026-05-01");
        Course entrepreneuriat = course("entrepreneuriat-numerique", "Entrepreneuriat numérique et réseaux sociaux", cat.get("entrepreneuriat"), Level.INTERMEDIAIRE, 20, 4, akossiwa,
                both, AccessMode.LIBRE, 4.7, false, false,
                "Lancez une activité et faites-la connaître grâce à WhatsApp Business et Facebook.",
                "Transformez une idée en activité : définir son offre, fixer ses prix, créer une page professionnelle, publier régulièrement et vendre grâce aux outils numériques gratuits.",
                List.of("Savoir utiliser un smartphone"),
                List.of("Définir son projet et sa cible", "Créer une page professionnelle", "Planifier ses publications", "Gérer ses clients avec WhatsApp Business"),
                List.of("WhatsApp Business", "Facebook", "Marketing", "Gestion"),
                List.of(m("Mon projet", l("Trouver une idée"), l("Définir sa cible", LessonType.VIDEO, "10 min")),
                        m("Visibilité", l("Créer une page Facebook", LessonType.VIDEO, "12 min"), l("WhatsApp Business", LessonType.VIDEO, "10 min"),
                                tp("Calendrier de publication", "20 min"))),
                CourseStatus.PUBLIEE, "2026-04-15");
        course("powerpoint-presentations", "PowerPoint : réussir ses présentations", cat.get("bureautique"), Level.DEBUTANT, 12, 3, koffi,
                List.of(CertType.ATTESTATION), AccessMode.LIBRE, 0, false, true,
                "Concevez des diaporamas clairs et convaincants pour vos exposés et réunions.",
                "Apprenez à structurer une présentation, choisir une mise en page lisible, insérer images et graphiques, et présenter avec assurance devant un public.",
                List.of("Initiation à l'informatique"), List.of("Structurer une présentation", "Créer des diapositives lisibles", "Présenter avec aisance"),
                List.of("PowerPoint", "Prise de parole"),
                List.of(m("Les bases", l("L'interface de PowerPoint", LessonType.VIDEO, "10 min"), l("Créer ses premières diapositives")),
                        m("Une présentation réussie", l("Règles de mise en page"), l("Animations et transitions")),
                        m("Présenter", l("Préparer son oral"), tp("Projet : mon exposé", "30 min"))),
                CourseStatus.EN_VALIDATION, "2026-10-10");
        Course arduino = course("initiation-arduino", "Initiation à Arduino", cat.get("programmation"), Level.INTERMEDIAIRE, 24, 5, kwami,
                comp, AccessMode.VALIDATION, 0, false, true,
                "Programmez des montages électroniques simples : LED, capteurs et moteurs.",
                "Découvrez la carte Arduino et réalisez vos premiers montages électroniques programmés.",
                List.of("Programmation Python pour débutants ou équivalent"), List.of("Comprendre un circuit simple", "Programmer une carte Arduino"),
                List.of("Arduino", "Électronique"),
                List.of(m("Découvrir Arduino", l("La carte Arduino", LessonType.VIDEO, "10 min"), l("Installer l'environnement")),
                        m("Premiers montages", l("Faire clignoter une LED"), l("Lire un capteur")),
                        m("Projets", l("Feu tricolore"), l("Station météo")),
                        m("Moteurs", l("Servomoteur")), m("Projet final", tp("Mon projet Arduino", "60 min"))),
                CourseStatus.EN_VALIDATION, "2026-10-12");
        arduino.setSubmittedAt(Instant.now().minusSeconds(86400));

        // Banque de questions et examens
        List<Question> initQs = List.of(
                unique(initiation, "Quel élément permet d'afficher les informations à l'écran ?", List.of("Le clavier", "L'écran (moniteur)", "La souris", "L'unité centrale"), 1),
                trueFalse(initiation, "Une clé USB permet de transporter des fichiers d'un ordinateur à un autre.", true),
                question(initiation, null, QuestionType.MULTIPLE, "Parmi ces éléments, lesquels sont des périphériques d'entrée ? (plusieurs réponses)",
                        List.of("Le clavier", "L'imprimante", "La souris", "Le micro"), List.of(0, 2, 3), List.of(), 2),
                unique(initiation, "Quel raccourci clavier permet de copier un élément ?", List.of("Ctrl + V", "Ctrl + C", "Ctrl + X", "Ctrl + Z"), 1),
                trueFalse(initiation, "Il est conseillé d'utiliser le même mot de passe pour tous ses comptes.", false),
                unique(initiation, "Dans une adresse e-mail, quel symbole sépare le nom du fournisseur ?", List.of("#", "&", "@", "/"), 2),
                question(initiation, null, QuestionType.COURTE, "Comment appelle-t-on le logiciel utilisé pour naviguer sur Internet ? (un mot)",
                        List.of(), List.of(), List.of("navigateur", "un navigateur", "navigateur web"), 1),
                question(initiation, null, QuestionType.MULTIPLE, "Quelles actions permettent de supprimer un fichier ? (plusieurs réponses)",
                        List.of("Touche Suppr", "Glisser dans la corbeille", "Double-clic", "Clic droit > Supprimer"), List.of(0, 1, 3), List.of(), 2),
                unique(initiation, "Que signifie « www » dans une adresse web ?", List.of("World Wide Web", "Web Wireless World", "Windows Web Workspace", "World Web Window"), 0),
                trueFalse(initiation, "Le bouton « Démarrer » de Windows se trouve généralement en bas à gauche de l'écran.", true));
        question(initiation, null, QuestionType.PRATIQUE, "Créez un dossier « Mes documents ALuNI » contenant 3 sous-dossiers et déposez une capture d'écran.",
                List.of(), List.of(), List.of(), 5);
        Exam initExam = exam(initiation, 20, 10, 60, initQs);

        // Quiz d'entraînement (Initiation)
        List<CourseModule> im = initiation.getModules();
        question(initiation, im.get(0), QuestionType.UNIQUE, "Quel élément de l'ordinateur sert à saisir du texte ?", List.of("La souris", "Le clavier", "L'écran"), List.of(1), List.of(), 1);
        question(initiation, im.get(0), QuestionType.UNIQUE, "Pour éteindre correctement un ordinateur, on…", List.of("Débranche le câble", "Utilise le menu Démarrer > Arrêter", "Appuie longtemps sur le bouton"), List.of(1), List.of(), 1);
        question(initiation, im.get(0), QuestionType.UNIQUE, "Le clic droit permet généralement…", List.of("D'ouvrir un menu d'options", "D'éteindre l'écran", "De copier le texte"), List.of(0), List.of(), 1);
        question(initiation, im.get(1), QuestionType.UNIQUE, "Où vont les fichiers supprimés ?", List.of("Dans la corbeille", "Sur Internet", "Dans l'imprimante"), List.of(0), List.of(), 1);
        question(initiation, im.get(1), QuestionType.VRAIFAUX, "On peut ranger un dossier dans un autre dossier.", List.of("Vrai", "Faux"), List.of(0), List.of(), 1);
        question(initiation, im.get(1), QuestionType.UNIQUE, "Pour renommer un fichier, on peut appuyer sur…", List.of("F2", "Échap", "Entrée"), List.of(0), List.of(), 1);
        question(initiation, im.get(2), QuestionType.UNIQUE, "Lequel de ces logiciels est un navigateur ?", List.of("Chrome", "Word", "Excel"), List.of(0), List.of(), 1);
        question(initiation, im.get(2), QuestionType.VRAIFAUX, "Une pièce jointe est un fichier envoyé avec un e-mail.", List.of("Vrai", "Faux"), List.of(0), List.of(), 1);
        question(initiation, im.get(2), QuestionType.UNIQUE, "Que faut-il faire d'un e-mail suspect demandant votre mot de passe ?", List.of("Le supprimer sans répondre", "Répondre rapidement", "Transférer à ses amis"), List.of(0), List.of(), 1);

        Map<String, Exam> examByCourse = new HashMap<>();
        examByCourse.put(initiation.getSlug(), initExam);
        for (Course c : List.of(word, excel, web, python, design, maintenance, entrepreneuriat)) {
            List<String> skills = c.getSkills();
            List<Question> qs = new ArrayList<>(List.of(
                    trueFalse(c, "À l'issue de la formation, on sait : " + c.getObjectives().get(0).toLowerCase() + ".", true),
                    unique(c, "Quelle compétence est travaillée dans « " + c.getTitle() + " » ?",
                            List.of(skills.get(0), "Cuisine traditionnelle", "Couture", "Mécanique automobile"), 0),
                    unique(c, "Lequel de ces éléments fait partie du programme ?",
                            List.of("Jardinage", skills.get(1), "Menuiserie", "Coiffure"), 1),
                    trueFalse(c, "Cette formation comporte des exercices pratiques.", true),
                    question(c, null, QuestionType.MULTIPLE, "Quels thèmes sont abordés dans la formation ? (plusieurs réponses)",
                            List.of(c.getModules().get(0).getTitle(), "Élevage de volailles", c.getModules().get(1).getTitle(), "Plomberie"),
                            List.of(0, 2), List.of(), 2)));
            examByCourse.put(c.getSlug(), exam(c, 15, 5, 60, qs));
        }

        // Inscriptions, progression, examens et certificats de démonstration
        Enrollment e;
        e = enroll(kossi, initiation, EnrollmentStatus.ACTIF, "2026-09-02");
        complete(e, 9);
        quizResult(kossi, im.get(0), 100);
        quizResult(kossi, im.get(1), 67);
        e = enroll(kossi, web, EnrollmentStatus.ACTIF, "2026-09-15");
        complete(e, 4);
        e = enroll(kossi, securite, EnrollmentStatus.ACTIF, "2026-07-20");
        complete(e, 5);
        certificate("ALUNI-2026-000121", kossi, securite, CertType.ATTESTATION, null, "2026-08-02", CertificateStatus.VALIDE);

        e = enroll(essi, initiation, EnrollmentStatus.ACTIF, "2026-08-15");
        complete(e, 12);
        attempt(essi, initExam, 1, 86, 0, at("2026-10-04"));
        certificate("ALUNI-2026-000148", essi, initiation, CertType.COMPETENCE, 86, "2026-10-05", CertificateStatus.VALIDE);

        e = enroll(komlan, web, EnrollmentStatus.ACTIF, "2026-09-10");
        completePercent(e, 42);
        enroll(komlan, python, EnrollmentStatus.EN_ATTENTE, "2026-10-16");

        e = enroll(afi, entrepreneuriat, EnrollmentStatus.ACTIF, "2026-07-21");
        complete(e, 5);
        attempt(afi, examByCourse.get(entrepreneuriat.getSlug()), 1, 78, 2, at("2026-09-20"));
        certificate("ALUNI-2026-000131", afi, entrepreneuriat, CertType.COMPETENCE, 78, "2026-09-21", CertificateStatus.VALIDE);
        certificate("ALUNI-2026-000130", afi, entrepreneuriat, CertType.ATTESTATION, null, "2026-09-12", CertificateStatus.VALIDE);

        e = enroll(kodjo, design, EnrollmentStatus.ACTIF, "2026-06-03");
        complete(e, 7);
        Exam designExam = examByCourse.get(design.getSlug());
        attempt(kodjo, designExam, 1, 55, 0, at("2026-09-28"));
        attempt(kodjo, designExam, 2, 74, 0, at("2026-10-03"));
        certificate("ALUNI-2026-000152", kodjo, design, CertType.COMPETENCE, 74, "2026-10-05", CertificateStatus.VALIDE);

        e = enroll(mawuli, word, EnrollmentStatus.ACTIF, "2026-05-11");
        complete(e, 9);
        attempt(mawuli, examByCourse.get(word.getSlug()), 1, 71, 7, at("2026-06-13"));
        Certificate revoked = certificate("ALUNI-2026-000097", mawuli, word, CertType.COMPETENCE, 71, "2026-06-14", CertificateStatus.REVOQUE);
        revoked.setRevokedReason("Fraude avérée lors de l'examen (aide extérieure).");
        revoked.setRevokedAt(at("2026-06-20"));

        e = enroll(yawa, initiation, EnrollmentStatus.ACTIF, "2026-10-01");
        complete(e, 2);
        e = enroll(edem, excel, EnrollmentStatus.ACTIF, "2026-08-28");
        completePercent(e, 55);
        attempt(edem, examByCourse.get(excel.getSlug()), 1, 52, 1, at("2026-10-08"));
        enroll(edem, maintenance, EnrollmentStatus.EN_ATTENTE, "2026-10-17");

        // Exercices déposés
        submission(kodjo, design, lessonByTitle(design, "Créer une affiche d'événement"), "affiche_kodjo.png", new Color(0xD9530F), "2026-10-12", null);
        submission(afi, entrepreneuriat, lessonByTitle(entrepreneuriat, "Calendrier de publication"), "calendrier_afi.xlsx", Color.WHITE, "2026-10-11", null);
        submission(essi, initiation, lessonByTitle(initiation, "Créer et renommer un dossier"), "dossiers_essi.jpg", new Color(0x1A6F33), "2026-10-02", 17);

        // Autres apprenants (statistiques réalistes)
        generateLearners(List.of(initiation, word, excel, web, design, securite, entrepreneuriat, maintenance), examByCourse);

        // Notifications de l'apprenant de démonstration
        notification(kossi, NotificationType.EXAM, "Examen ouvert", "L'examen final « Initiation à l'informatique » est disponible.", "/apprenant/examens", "2026-10-10", false);
        notification(kossi, NotificationType.LESSON, "Nouvelle leçon", "Une nouvelle leçon « Mise en page avec Flexbox » a été ajoutée.", "/apprendre/site-web-html-css", "2026-10-08", false);
        notification(kossi, NotificationType.CERTIFICATE, "Certificat disponible", "Votre attestation « Sécurité en ligne » est prête à être téléchargée.", "/apprenant/certificats/ALUNI-2026-000121", "2026-08-02", true);

        seedSiteContent();
    }

    private void quizResult(User u, CourseModule module, int score) {
        QuizResult q = new QuizResult();
        q.setUser(u);
        q.setModule(module);
        q.setScore(score);
        quizResults.save(q);
    }

    private void generateLearners(List<Course> pool, Map<String, Exam> examByCourse) {
        String[] firstF = { "Akouvi", "Ablavi", "Dela", "Enyonam", "Mawuena", "Sena", "Kafui", "Elinam", "Yayra", "Delali" };
        String[] firstM = { "Kodzo", "Mensah", "Selom", "Elom", "Komi", "Yao", "Kokou", "Edem", "Fiifi", "Dodzi" };
        String[] last = { "Amouzou", "Kpogo", "Tchalla", "Akakpo", "Gbadoe", "Adzoh", "Klutse", "Dossou", "Atsu", "Ekoue", "Agbodjan", "Sodji" };
        int[] perMonth = { 3, 3, 4, 4, 5, 5, 6, 7, 8, 5 };
        String[] centers = { "CDEJ TG0212 Atakpamé", "CDEJ TG0188 Notsé", "CDEJ TG0103 Lomé" };
        int n = 0;
        for (int month = 1; month <= perMonth.length; month++) {
            for (int k = 0; k < perMonth[month - 1]; k++, n++) {
                boolean female = random.nextBoolean();
                String first = female ? firstF[random.nextInt(firstF.length)] : firstM[random.nextInt(firstM.length)];
                double p = random.nextDouble();
                ProfileType profile = p < 0.62 ? ProfileType.INTERNE : p < 0.84 ? ProfileType.AUTRE_CDEJ : ProfileType.PARTICULIER;
                String center = switch (profile) {
                    case INTERNE -> "CDEJ TG0157";
                    case AUTRE_CDEJ -> centers[random.nextInt(centers.length)];
                    case PARTICULIER -> null;
                };
                LocalDate created = LocalDate.of(2026, month, 1 + random.nextInt(27));
                if (created.isAfter(LocalDate.now())) created = LocalDate.now().minusDays(1);
                User u = user(first, last[random.nextInt(last.length)], String.format("98%06d", n), null, Role.APPRENANT,
                        profile, center, female ? "F" : "M", (2004 + random.nextInt(8)) + "-0" + (1 + random.nextInt(9)) + "-1" + random.nextInt(9),
                        created.toString());
                int count = 1 + random.nextInt(2);
                List<Course> chosen = new ArrayList<>(pool);
                java.util.Collections.shuffle(chosen, random);
                for (Course c : chosen.subList(0, count)) {
                    LocalDate enrolled = created.plusDays(random.nextInt(5));
                    Enrollment e = enroll(u, c, EnrollmentStatus.ACTIF, enrolled.toString());
                    int pct = month <= 7 && random.nextDouble() < 0.7 ? 100 : 10 * random.nextInt(10);
                    completePercent(e, pct);
                    Exam exam = examByCourse.get(c.getSlug());
                    if (pct == 100 && exam != null) {
                        int score = 45 + random.nextInt(50);
                        Instant when = e.getCompletedAt() == null ? Instant.now() : e.getCompletedAt();
                        if (when.isAfter(Instant.now())) when = Instant.now().minusSeconds(3600);
                        attempt(u, exam, 1, score, random.nextInt(10) == 0 ? 1 : 0, when);
                        if (score >= exam.getPassMark()) {
                            String date = LocalDate.ofInstant(when, ZoneOffset.UTC).toString();
                            certificate(String.format("ALUNI-2026-%06d", 200 + n * 3 + chosen.indexOf(c)), u, c, CertType.COMPETENCE,
                                    score, date, CertificateStatus.VALIDE);
                        }
                    }
                }
            }
        }
    }

    private void seedSiteContent() {
        newsItem("remise-certificats-octobre-2026", "Cérémonie de remise des certificats – promotion 2026", "2026-10-05", "Événement",
                "48 jeunes ont reçu leur certificat de compétence en bureautique et en design graphique lors d'une cérémonie au CDEJ.",
                "Le samedi 5 octobre 2026, l'Académie Lumière du Numérique et de l'Innovation a célébré sa nouvelle promotion. 48 jeunes ont reçu leur certificat en présence des parents, des responsables du CDEJ et des partenaires.\n\n"
                        + "Chaque certificat porte un numéro unique et un QR code : les employeurs peuvent désormais vérifier son authenticité directement en ligne.\n\n"
                        + "Félicitations à tous les lauréats et merci aux formateurs pour leur engagement !", true);
        newsItem("nouvelle-session-html-css", "Nouvelle session : Créer son premier site web", "2026-09-22", "Session",
                "Les inscriptions pour la session de novembre sont ouvertes. Places limitées à 25 apprenants en salle.",
                "Une nouvelle session de la formation « Créer son premier site web (HTML & CSS) » démarre le 4 novembre 2026.\n\n"
                        + "La formation se suit en ligne et en salle, avec un examen final supervisé à l'Académie. Inscrivez-vous dès maintenant depuis le catalogue.", true);
        newsItem("lancement-plateforme", "ALuNI lance sa plateforme de formation en ligne", "2026-09-01", "Annonce",
                "Les jeunes du CDEJ, des autres CDEJ et les particuliers peuvent désormais se former à distance et obtenir une certification.",
                "L'Académie ouvre sa plateforme en ligne pour permettre à chacun de se former à son rythme, depuis la salle informatique, la maison ou son téléphone.\n\n"
                        + "Créez votre compte gratuitement et découvrez le catalogue des formations.", true);
        newsItem("portes-ouvertes-novembre", "Journée portes ouvertes de la salle informatique", "2026-11-08", "Événement",
                "Venez découvrir la salle informatique et rencontrer les formateurs.", "Programme à venir.", false);

        String[] partnerNames = { "CDEJ TG0157", "Église partenaire", "Mairie de Kpévé", "Réseau des CDEJ du Togo", "Partenaire technique" };
        for (int i = 0; i < partnerNames.length; i++) {
            Partner p = new Partner();
            p.setName(partnerNames[i]);
            p.setPosition(i);
            partners.save(p);
        }

        String[][] items = {
                { "Qui peut s'inscrire sur la plateforme ?", "Les jeunes du CDEJ Lumière de Kpévé, les jeunes des autres CDEJ et toute personne qui souhaite se former ou faire certifier ses compétences numériques.", "Inscription" },
                { "Les formations sont-elles payantes ?", "Les conditions d'accès sont fixées par l'Académie pour chaque formation. Les jeunes du CDEJ y ont accès selon le programme du centre. Les détails sont indiqués sur la page de chaque formation.", "Inscription" },
                { "Je n'ai pas d'adresse e-mail, puis-je créer un compte ?", "Oui. Vous pouvez vous inscrire et vous connecter uniquement avec votre numéro de téléphone.", "Compte" },
                { "J'ai oublié mon mot de passe, que faire ?", "Cliquez sur « Mot de passe oublié » sur la page de connexion. Vous recevrez un code par SMS ou par e-mail pour en créer un nouveau.", "Compte" },
                { "Puis-je suivre les cours sur mon téléphone ?", "Oui, la plateforme fonctionne sur ordinateur, tablette et smartphone. Votre progression est enregistrée automatiquement.", "Formations" },
                { "Que se passe-t-il si la connexion ou le courant coupe pendant un examen ?", "Vos réponses sont enregistrées automatiquement à chaque clic. Reconnectez-vous et reprenez l'examen là où vous l'avez laissé, dans la limite du temps restant.", "Examens" },
                { "Quelle est la différence entre attestation et certificat ?", "L'attestation de suivi prouve que vous avez terminé la formation. Le certificat de compétence prouve que vous avez réussi l'examen final.", "Certificats" },
                { "Comment un employeur peut-il vérifier mon certificat ?", "Il lui suffit de scanner le QR code imprimé sur le certificat ou de saisir son numéro sur la page « Vérifier un certificat ».", "Certificats" },
                { "Comment devenir formateur à l'Académie ?", "Créez un compte en choisissant le profil « Formateur ». Votre compte sera activé après validation par l'administration de l'Académie.", "Formateurs" } };
        for (int i = 0; i < items.length; i++) {
            FaqItem f = new FaqItem();
            f.setQuestion(items[i][0]);
            f.setAnswer(items[i][1]);
            f.setTag(items[i][2]);
            f.setPosition(i);
            faq.save(f);
        }
    }

    private void newsItem(String slug, String title, String date, String category, String excerpt, String body, boolean published) {
        News n = new News();
        n.setSlug(slug);
        n.setTitle(title);
        n.setPublishedAt(LocalDate.parse(date));
        n.setCategory(category);
        n.setExcerpt(excerpt);
        n.setBody(body);
        n.setPublished(published);
        news.save(n);
    }
}
