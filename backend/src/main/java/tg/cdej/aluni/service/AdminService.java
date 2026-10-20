package tg.cdej.aluni.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.common.Codes;
import tg.cdej.aluni.domain.AccountStatus;
import tg.cdej.aluni.domain.AttemptStatus;
import tg.cdej.aluni.domain.Category;
import tg.cdej.aluni.domain.CertificateStatus;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.CourseStatus;
import tg.cdej.aluni.domain.Enrollment;
import tg.cdej.aluni.domain.EnrollmentStatus;
import tg.cdej.aluni.domain.ExamAttempt;
import tg.cdej.aluni.domain.NotificationType;
import tg.cdej.aluni.domain.ProfileType;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.AdminDtos.AdminDashboard;
import tg.cdej.aluni.dto.AdminDtos.ImportResult;
import tg.cdej.aluni.dto.AdminDtos.ImportRow;
import tg.cdej.aluni.dto.AdminDtos.LabelValue;
import tg.cdej.aluni.dto.AdminDtos.PendingCourse;
import tg.cdej.aluni.dto.AdminDtos.PendingEnrollment;
import tg.cdej.aluni.dto.AdminDtos.PendingTrainer;
import tg.cdej.aluni.dto.AdminDtos.Validations;
import tg.cdej.aluni.dto.CourseDtos.AdminCourseDto;
import tg.cdej.aluni.dto.CourseDtos.CategoryDto;
import tg.cdej.aluni.dto.CourseDtos.CategoryRequest;
import tg.cdej.aluni.dto.UserDtos.AdminUserCreate;
import tg.cdej.aluni.dto.UserDtos.AdminUserDto;
import tg.cdej.aluni.dto.UserDtos.AdminUserPatch;
import tg.cdej.aluni.dto.UserDtos.CreatedAccount;
import tg.cdej.aluni.repository.CategoryRepository;
import tg.cdej.aluni.repository.CertificateRepository;
import tg.cdej.aluni.repository.CourseRepository;
import tg.cdej.aluni.repository.EnrollmentRepository;
import tg.cdej.aluni.repository.ExamAttemptRepository;
import tg.cdej.aluni.repository.UserRepository;

@Service
public class AdminService {

    private static final String[] MONTHS = { "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc" };

    private final UserRepository users;
    private final CourseRepository courses;
    private final CategoryRepository categories;
    private final EnrollmentRepository enrollments;
    private final ExamAttemptRepository attempts;
    private final CertificateRepository certificates;
    private final CertificateService certificateService;
    private final NotificationService notifications;
    private final AuthService auth;
    private final ExcelService excel;
    private final MessageSender sender;
    private final PasswordEncoder encoder;
    private final Mapper mapper;

    public AdminService(UserRepository users, CourseRepository courses, CategoryRepository categories,
            EnrollmentRepository enrollments, ExamAttemptRepository attempts, CertificateRepository certificates,
            CertificateService certificateService, NotificationService notifications, AuthService auth,
            ExcelService excel, MessageSender sender, PasswordEncoder encoder, Mapper mapper) {
        this.users = users;
        this.courses = courses;
        this.categories = categories;
        this.enrollments = enrollments;
        this.attempts = attempts;
        this.certificates = certificates;
        this.certificateService = certificateService;
        this.notifications = notifications;
        this.auth = auth;
        this.excel = excel;
        this.sender = sender;
        this.encoder = encoder;
        this.mapper = mapper;
    }

    static String monthLabel(int month) {
        return MONTHS[month - 1];
    }

    // ------------------------------------------------------------ Tableau de bord

    @Transactional(readOnly = true)
    public AdminDashboard dashboard() {
        List<User> learners = users.findByRoleOrderByCreatedAtDesc(Role.APPRENANT);
        Instant monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        List<ExamAttempt> done = attempts.findByStatus(AttemptStatus.SOUMIS);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("learners", learners.size());
        stats.put("learnersThisMonth", learners.stream().filter(u -> u.getCreatedAt().isAfter(monthStart)).count());
        stats.put("activeCourses", courses.countByStatus(CourseStatus.PUBLIEE));
        stats.put("pendingCourses", courses.countByStatus(CourseStatus.EN_VALIDATION));
        stats.put("successRate", successRate(done));
        stats.put("certificates", certificates.count() - certificates.countByStatus(CertificateStatus.EN_ATTENTE));
        stats.put("revoked", certificates.countByStatus(CertificateStatus.REVOQUE));
        stats.put("pendingValidations", validationsCount());

        int year = LocalDate.now().getYear();
        long[] perMonth = new long[12];
        learners.forEach(u -> {
            LocalDate d = LocalDate.ofInstant(u.getCreatedAt(), ZoneOffset.UTC);
            if (d.getYear() == year) perMonth[d.getMonthValue() - 1]++;
        });
        List<LabelValue> monthly = new ArrayList<>();
        for (int m = 1; m <= LocalDate.now().getMonthValue(); m++) monthly.add(new LabelValue(monthLabel(m), perMonth[m - 1]));

        List<LabelValue> profiles = List.of(
                new LabelValue("CDEJ interne", learners.stream().filter(u -> u.getProfileType() == ProfileType.INTERNE).count()),
                new LabelValue("Autres CDEJ", learners.stream().filter(u -> u.getProfileType() == ProfileType.AUTRE_CDEJ).count()),
                new LabelValue("Particuliers", learners.stream().filter(u -> u.getProfileType() == ProfileType.PARTICULIER).count()));

        Validations v = validations();
        return new AdminDashboard(stats, monthly, profiles, v.trainers(), v.courses(),
                certificates.findAllByOrderByIssuedAtDescIdDesc().stream().limit(5).map(mapper::certificate).toList());
    }

    /** Taux de réussite : part des candidats ayant réussi parmi ceux qui ont passé un examen. */
    static Integer successRate(List<ExamAttempt> done) {
        Map<String, Boolean> byCandidate = new LinkedHashMap<>();
        done.forEach(a -> byCandidate.merge(a.getUser().getId() + ":" + a.getExam().getId(),
                Boolean.TRUE.equals(a.getPassed()), (x, y) -> x || y));
        if (byCandidate.isEmpty()) return null;
        long passed = byCandidate.values().stream().filter(b -> b).count();
        return Math.round(passed * 100f / byCandidate.size());
    }

    private long validationsCount() {
        return users.findByRoleAndStatusOrderByCreatedAtAsc(Role.FORMATEUR, AccountStatus.EN_ATTENTE).size()
                + courses.countByStatus(CourseStatus.EN_VALIDATION)
                + enrollments.findByStatusOrderByEnrolledAtAsc(EnrollmentStatus.EN_ATTENTE).size()
                + certificates.countByStatus(CertificateStatus.EN_ATTENTE);
    }

    // ------------------------------------------------------------ Utilisateurs

    @Transactional(readOnly = true)
    public List<AdminUserDto> users(String role, String q) {
        Role r = Codes.parse(Role.class, role);
        String term = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        List<User> list = r == null ? users.findAll() : users.findByRoleOrderByCreatedAtDesc(r);
        return list.stream()
                .filter(u -> term.isEmpty() || (u.fullName() + " " + u.getPhone() + " " + u.getEmail()).toLowerCase(Locale.ROOT).contains(term))
                .map(mapper::adminUser).toList();
    }

    @Transactional
    public CreatedAccount createUser(AdminUserCreate r) {
        String phone = Texts.normalize(r.phone());
        String email = Texts.email(r.email());
        if (phone == null && email == null) throw ApiException.badRequest("Indiquez au moins un téléphone ou un e-mail.");
        auth.checkUnique(phone, email, null);
        Role role = Codes.require(Role.class, r.role(), "rôle");
        User u = new User();
        u.setFirstName(r.firstName().trim());
        u.setLastName(r.lastName().trim());
        u.setPhone(phone);
        u.setEmail(email);
        u.setBirthDate(r.birthDate());
        u.setGender(r.gender());
        u.setRole(role);
        if (role == Role.APPRENANT) {
            ProfileType profile = r.profile() == null ? ProfileType.INTERNE : Codes.require(ProfileType.class, r.profile(), "profil");
            u.setProfileType(profile);
            u.setCenterName(profile == ProfileType.INTERNE ? "CDEJ TG0157" : r.center());
        }
        if (role == Role.FORMATEUR) {
            u.setSpeciality(r.speciality());
            u.setTitle(r.speciality() == null ? "Formateur" : "Formateur – " + r.speciality());
        }
        u.setStatus(AccountStatus.ACTIF);
        String password = AuthService.temporaryPassword();
        u.setPasswordHash(encoder.encode(password));
        users.save(u);
        sendCredentials(u, password);
        return new CreatedAccount(u.getId(), u.fullName(), Texts.display(phone), email, password);
    }

    private void sendCredentials(User u, String password) {
        String text = "Bienvenue sur ALuNI ! Identifiant : " + (u.getPhone() != null ? u.getPhone() : u.getEmail())
                + " – mot de passe provisoire : " + password + ". Changez-le dès votre première connexion.";
        if (u.getPhone() != null) sender.sendSms(u.getPhone(), text);
        else sender.sendEmail(u.getEmail(), "Votre compte ALuNI", text);
    }

    @Transactional
    public AdminUserDto patchUser(User admin, Long id, AdminUserPatch p) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("Utilisateur introuvable."));
        if (u.getId().equals(admin.getId())) throw ApiException.badRequest("Vous ne pouvez pas modifier votre propre compte ici.");
        if (p.status() != null) {
            AccountStatus status = Codes.require(AccountStatus.class, p.status(), "statut");
            if (status == AccountStatus.ACTIF && u.getStatus() == AccountStatus.EN_ATTENTE) {
                notifications.notify(u, NotificationType.ACCOUNT, "Compte activé", "Votre compte a été activé par l'Académie.", null);
            }
            u.setStatus(status);
        }
        if (p.role() != null) {
            Role role = Codes.require(Role.class, p.role(), "rôle");
            if (role == Role.APPRENANT && u.getProfileType() == null) u.setProfileType(ProfileType.PARTICULIER);
            u.setRole(role);
        }
        return mapper.adminUser(u);
    }

    /** Import Excel / CSV de comptes apprenants du CDEJ. Avec dryRun, renvoie seulement l'aperçu. */
    @Transactional
    public ImportResult importUsers(MultipartFile file, boolean dryRun) {
        List<ImportRow> rows = excel.readUsers(file);
        List<ImportRow> checked = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (ImportRow r : rows) {
            String error = r.error();
            String phone = null;
            if (error == null) {
                try {
                    phone = Texts.normalize(r.phone());
                } catch (ApiException e) {
                    error = "Téléphone invalide";
                }
            }
            String email = Texts.email(r.email());
            if (error == null && phone == null && email == null) error = "Téléphone ou e-mail requis";
            if (error == null && phone != null && (users.existsByPhone(phone) || !seen.add(phone))) error = "Téléphone déjà utilisé";
            if (error == null && email != null && (users.existsByEmailIgnoreCase(email) || !seen.add(email))) error = "E-mail déjà utilisé";
            checked.add(new ImportRow(r.line(), r.lastName(), r.firstName(), r.birthDate(), r.gender(),
                    phone == null ? r.phone() : Texts.display(phone), email, error));
        }
        int valid = (int) checked.stream().filter(r -> r.error() == null).count();
        List<CreatedAccount> created = new ArrayList<>();
        if (!dryRun) {
            for (ImportRow r : checked) {
                if (r.error() != null) continue;
                created.add(createUser(new AdminUserCreate(r.firstName(), r.lastName(), r.phone(), r.email(), "apprenant",
                        "interne", null, null, r.birthDate(), r.gender())));
            }
        }
        return new ImportResult(checked, valid, checked.size() - valid, created);
    }

    // ------------------------------------------------------------ Validations

    @Transactional(readOnly = true)
    public Validations validations() {
        List<PendingTrainer> trainers = users.findByRoleAndStatusOrderByCreatedAtAsc(Role.FORMATEUR, AccountStatus.EN_ATTENTE)
                .stream().map(u -> new PendingTrainer(u.getId(), u.fullName(), u.getEmail(), Texts.display(u.getPhone()),
                        u.getSpeciality(), u.getCreatedAt())).toList();
        List<PendingCourse> pendingCourses = courses.findByStatusOrderByCreatedAtAsc(CourseStatus.EN_VALIDATION).stream()
                .map(c -> new PendingCourse(c.getId(), c.getSlug(), c.getTitle(), c.getTrainer().fullName(),
                        c.getCategory().getSlug(), c.getModules().size(),
                        c.getSubmittedAt() == null ? c.getCreatedAt() : c.getSubmittedAt())).toList();
        List<PendingEnrollment> pendingEnrollments = enrollments.findByStatusOrderByEnrolledAtAsc(EnrollmentStatus.EN_ATTENTE)
                .stream().map(e -> new PendingEnrollment(e.getId(), e.getUser().fullName(), Codes.of(e.getUser().getProfileType()),
                        mapper.courseRef(e.getCourse()), e.getEnrolledAt())).toList();
        return new Validations(trainers, pendingCourses, pendingEnrollments,
                certificates.findByStatusOrderByIssuedAtAsc(CertificateStatus.EN_ATTENTE).stream().map(mapper::certificate).toList());
    }

    @Transactional
    public void decide(String kind, String id, boolean approve, String comment) {
        switch (kind) {
            case "trainers" -> {
                User u = users.findById(Long.valueOf(id)).filter(x -> x.getRole() == Role.FORMATEUR && x.getStatus() == AccountStatus.EN_ATTENTE)
                        .orElseThrow(() -> ApiException.notFound("Demande introuvable."));
                u.setStatus(approve ? AccountStatus.ACTIF : AccountStatus.REFUSE);
                String text = approve ? "Votre compte formateur ALuNI est activé. Vous pouvez vous connecter."
                        : "Votre demande de compte formateur ALuNI n'a pas été retenue.";
                if (u.getPhone() != null) sender.sendSms(u.getPhone(), text);
                if (u.getEmail() != null) sender.sendEmail(u.getEmail(), "Votre demande de compte formateur", text);
                if (approve) notifications.notify(u, NotificationType.ACCOUNT, "Compte formateur activé", text, "/formateur");
            }
            case "courses" -> {
                Course c = courses.findById(Long.valueOf(id)).filter(x -> x.getStatus() == CourseStatus.EN_VALIDATION)
                        .orElseThrow(() -> ApiException.notFound("Formation introuvable."));
                c.setStatus(approve ? CourseStatus.PUBLIEE : CourseStatus.REFUSEE);
                c.setReviewComment(comment);
                notifications.notify(c.getTrainer(), NotificationType.COURSE,
                        approve ? "Formation publiée" : "Formation à revoir",
                        approve ? "« " + c.getTitle() + " » est maintenant visible dans le catalogue."
                                : "« " + c.getTitle() + " » n'a pas été validée." + (comment == null ? "" : " Motif : " + comment),
                        "/formateur/formations/" + c.getId());
            }
            case "enrollments" -> {
                Enrollment e = enrollments.findById(Long.valueOf(id)).filter(x -> x.getStatus() == EnrollmentStatus.EN_ATTENTE)
                        .orElseThrow(() -> ApiException.notFound("Inscription introuvable."));
                e.setStatus(approve ? EnrollmentStatus.ACTIF : EnrollmentStatus.REFUSE);
                e.setDecidedAt(Instant.now());
                notifications.notify(e.getUser(), NotificationType.ENROLLMENT,
                        approve ? "Inscription validée" : "Inscription refusée",
                        approve ? "Vous pouvez commencer « " + e.getCourse().getTitle() + " »."
                                : "Votre inscription à « " + e.getCourse().getTitle() + " » n'a pas été retenue."
                                        + (comment == null ? "" : " Motif : " + comment),
                        approve ? "/apprendre/" + e.getCourse().getSlug() : "/formations");
            }
            case "certificates" -> certificateService.decide(id, approve);
            default -> throw ApiException.notFound("Type de validation inconnu.");
        }
    }

    // ------------------------------------------------------------ Formations et catégories

    @Transactional(readOnly = true)
    public List<AdminCourseDto> courses() {
        return courses.findAll().stream().sorted((a, b) -> a.getId().compareTo(b.getId()))
                .map(c -> new AdminCourseDto(c.getId(), c.getSlug(), c.getTitle(), c.getCategory().getSlug(),
                        c.getCategory().getName(), c.getLevel().label(), c.getTrainer().fullName(), mapper.learnerCount(c),
                        Codes.of(c.getAccess()), Codes.of(c.getStatus())))
                .toList();
    }

    @Transactional
    public void setCourseStatus(Long id, String status) {
        Course c = courses.findById(id).orElseThrow(() -> ApiException.notFound("Formation introuvable."));
        CourseStatus s = Codes.require(CourseStatus.class, status, "statut");
        if (s != CourseStatus.PUBLIEE && s != CourseStatus.ARCHIVEE) throw ApiException.badRequest("Statut non autorisé.");
        c.setStatus(s);
    }

    @Transactional
    public CategoryDto saveCategory(Long id, CategoryRequest r) {
        Category c = id == null ? new Category() : categories.findById(id).orElseThrow(() -> ApiException.notFound("Catégorie introuvable."));
        if (id == null) {
            String slug = Texts.slugify(r.name());
            if (categories.existsBySlug(slug)) throw ApiException.conflict("Cette catégorie existe déjà.");
            c.setSlug(slug);
            c.setPosition((int) categories.count());
        }
        c.setName(r.name().trim());
        c.setIcon(r.icon() == null || r.icon().isBlank() ? "FileText" : r.icon());
        c.setColor(r.color() == null || r.color().isBlank() ? "from-gray-500 to-gray-700" : r.color());
        categories.save(c);
        return mapper.category(c, courses.countByCategory(c));
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category c = categories.findById(id).orElseThrow(() -> ApiException.notFound("Catégorie introuvable."));
        if (courses.countByCategory(c) > 0) throw ApiException.conflict("Cette catégorie contient des formations.");
        categories.delete(c);
    }
}
