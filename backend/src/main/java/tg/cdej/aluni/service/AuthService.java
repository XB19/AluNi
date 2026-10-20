package tg.cdej.aluni.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.common.Codes;
import tg.cdej.aluni.domain.AccountStatus;
import tg.cdej.aluni.domain.PasswordResetCode;
import tg.cdej.aluni.domain.ProfileType;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.UserDtos.AuthResponse;
import tg.cdej.aluni.dto.UserDtos.PasswordChange;
import tg.cdej.aluni.dto.UserDtos.ProfileUpdate;
import tg.cdej.aluni.dto.UserDtos.RegisterRequest;
import tg.cdej.aluni.dto.UserDtos.RegisterResponse;
import tg.cdej.aluni.dto.UserDtos.UserDto;
import tg.cdej.aluni.repository.PasswordResetCodeRepository;
import tg.cdej.aluni.repository.UserRepository;
import tg.cdej.aluni.security.LoginAttemptService;
import tg.cdej.aluni.security.TokenService;

@Service
public class AuthService {

    private static final Duration CODE_VALIDITY = Duration.ofMinutes(15);
    private static final int MAX_CODE_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final PasswordResetCodeRepository resetCodes;
    private final PasswordEncoder encoder;
    private final TokenService tokens;
    private final LoginAttemptService attempts;
    private final MessageSender sender;
    private final NotificationService notifications;
    private final StorageService storage;
    private final Mapper mapper;

    public AuthService(UserRepository users, PasswordResetCodeRepository resetCodes, PasswordEncoder encoder,
            TokenService tokens, LoginAttemptService attempts, MessageSender sender,
            NotificationService notifications, StorageService storage, Mapper mapper) {
        this.users = users;
        this.resetCodes = resetCodes;
        this.encoder = encoder;
        this.tokens = tokens;
        this.attempts = attempts;
        this.sender = sender;
        this.notifications = notifications;
        this.storage = storage;
        this.mapper = mapper;
    }

    /** Recherche par e-mail ou par numéro de téléphone. */
    public Optional<User> findByIdentifier(String identifier) {
        String id = identifier.trim();
        if (id.contains("@")) return users.findByEmailIgnoreCase(id);
        try {
            return users.findByPhone(Texts.normalize(id));
        } catch (ApiException e) {
            return Optional.empty();
        }
    }

    public void checkUnique(String phone, String email, Long exceptId) {
        if (phone != null) users.findByPhone(phone).filter(u -> !u.getId().equals(exceptId)).ifPresent(u -> {
            throw ApiException.conflict("Ce numéro de téléphone est déjà utilisé.");
        });
        if (email != null) users.findByEmailIgnoreCase(email).filter(u -> !u.getId().equals(exceptId)).ifPresent(u -> {
            throw ApiException.conflict("Cette adresse e-mail est déjà utilisée.");
        });
    }

    @Transactional
    public RegisterResponse register(RegisterRequest r) {
        String phone = Texts.normalize(r.phone());
        String email = Texts.email(r.email());
        if (phone == null && email == null) throw ApiException.badRequest("Indiquez au moins un téléphone ou un e-mail.");
        checkUnique(phone, email, null);

        boolean trainer = "formateur".equalsIgnoreCase(r.profile());
        User u = new User();
        u.setFirstName(r.firstName().trim());
        u.setLastName(r.lastName().trim());
        u.setBirthDate(r.birthDate());
        u.setGender(r.gender());
        u.setPhone(phone);
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(r.password()));
        if (trainer) {
            if (r.speciality() == null || r.speciality().isBlank()) throw ApiException.badRequest("Indiquez votre spécialité.");
            u.setRole(Role.FORMATEUR);
            u.setSpeciality(r.speciality().trim());
            u.setTitle("Formateur – " + r.speciality().trim());
            u.setStatus(AccountStatus.EN_ATTENTE);
        } else {
            ProfileType profile = Codes.require(ProfileType.class, r.profile(), "profil");
            u.setRole(Role.APPRENANT);
            u.setProfileType(profile);
            if (profile == ProfileType.AUTRE_CDEJ && (r.center() == null || r.center().isBlank())) {
                throw ApiException.badRequest("Indiquez le nom de votre centre.");
            }
            u.setCenterName(switch (profile) {
                case INTERNE -> "CDEJ TG0157";
                case AUTRE_CDEJ -> r.center().trim();
                case PARTICULIER -> null;
            });
            u.setStatus(AccountStatus.ACTIF);
        }
        users.save(u);

        if (trainer) {
            users.findByRoleAndStatusOrderByCreatedAtAsc(Role.ADMIN, AccountStatus.ACTIF).forEach(admin ->
                    notifications.notify(admin, tg.cdej.aluni.domain.NotificationType.ACCOUNT, "Nouvelle demande formateur",
                            u.fullName() + " souhaite devenir formateur (" + u.getSpeciality() + ").", "/admin/validations"));
            return new RegisterResponse(true, null, null,
                    "Votre demande a été envoyée. Votre compte sera activé après validation par l'Académie.");
        }
        notifications.notify(u, tg.cdej.aluni.domain.NotificationType.ACCOUNT, "Bienvenue sur ALuNI !",
                "Votre compte est créé. Choisissez une première formation dans le catalogue pour commencer.", "/formations");
        return new RegisterResponse(false, tokens.issue(u), mapper.user(u), null);
    }

    @Transactional
    public AuthResponse login(String identifier, String password) {
        String key = identifier.trim().toLowerCase();
        attempts.checkNotLocked(key);
        User u = findByIdentifier(identifier).orElse(null);
        if (u == null || !encoder.matches(password, u.getPasswordHash())) {
            attempts.failed(key);
            throw ApiException.unauthorized("Identifiant ou mot de passe incorrect.");
        }
        switch (u.getStatus()) {
            case EN_ATTENTE -> throw ApiException.forbidden("Votre compte est en attente de validation par l'Académie.");
            case SUSPENDU -> throw ApiException.forbidden("Votre compte est suspendu. Contactez l'Académie.");
            case REFUSE -> throw ApiException.forbidden("Votre demande de compte n'a pas été acceptée.");
            case ACTIF -> {
            }
        }
        attempts.succeeded(key);
        u.setLastLoginAt(Instant.now());
        return new AuthResponse(tokens.issue(u), mapper.user(u));
    }

    // ------------------------------------------------------------ Mot de passe oublié

    @Transactional
    public void forgotPassword(String channel, String identifier) {
        // Réponse identique que le compte existe ou non (ne révèle pas les comptes existants)
        findByIdentifier(identifier).filter(u -> u.getStatus() == AccountStatus.ACTIF).ifPresent(u -> {
            String code = String.format("%06d", RANDOM.nextInt(1_000_000));
            PasswordResetCode reset = new PasswordResetCode();
            reset.setUser(u);
            reset.setCodeHash(encoder.encode(code));
            reset.setExpiresAt(Instant.now().plus(CODE_VALIDITY));
            resetCodes.save(reset);
            String text = "ALuNI : votre code de récupération est " + code + ". Il est valable 15 minutes.";
            if ("email".equalsIgnoreCase(channel) && u.getEmail() != null) {
                sender.sendEmail(u.getEmail(), "Code de récupération ALuNI", text);
            } else if (u.getPhone() != null) {
                sender.sendSms(u.getPhone(), text);
            } else if (u.getEmail() != null) {
                sender.sendEmail(u.getEmail(), "Code de récupération ALuNI", text);
            }
        });
    }

    private PasswordResetCode checkCode(String identifier, String code) {
        User u = findByIdentifier(identifier).orElseThrow(() -> ApiException.badRequest("Code invalide ou expiré."));
        PasswordResetCode reset = resetCodes.findFirstByUserAndUsedFalseOrderByCreatedAtDesc(u)
                .orElseThrow(() -> ApiException.badRequest("Code invalide ou expiré."));
        if (reset.getExpiresAt().isBefore(Instant.now()) || reset.getAttempts() >= MAX_CODE_ATTEMPTS) {
            throw ApiException.badRequest("Code invalide ou expiré. Demandez un nouveau code.");
        }
        if (!encoder.matches(code.trim(), reset.getCodeHash())) {
            reset.setAttempts(reset.getAttempts() + 1);
            throw ApiException.badRequest("Code incorrect.");
        }
        return reset;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void verifyCode(String identifier, String code) {
        checkCode(identifier, code);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void resetPassword(String identifier, String code, String password) {
        PasswordResetCode reset = checkCode(identifier, code);
        reset.setUsed(true);
        reset.getUser().setPasswordHash(encoder.encode(password));
    }

    // ------------------------------------------------------------ Profil

    @Transactional
    public UserDto updateProfile(User u, ProfileUpdate p) {
        String phone = Texts.normalize(p.phone());
        String email = Texts.email(p.email());
        if (phone == null && email == null) throw ApiException.badRequest("Indiquez au moins un téléphone ou un e-mail.");
        checkUnique(phone, email, u.getId());
        u.setFirstName(p.firstName().trim());
        u.setLastName(p.lastName().trim());
        u.setPhone(phone);
        u.setEmail(email);
        if (p.birthDate() != null) u.setBirthDate(p.birthDate());
        if (p.gender() != null && p.gender().matches("[FM]")) u.setGender(p.gender());
        if (u.getRole() == Role.FORMATEUR) {
            u.setTitle(p.title());
            u.setBio(p.bio());
        }
        return mapper.user(users.save(u));
    }

    @Transactional
    public void changePassword(User u, PasswordChange p) {
        if (!encoder.matches(p.currentPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("Le mot de passe actuel est incorrect.");
        }
        u.setPasswordHash(encoder.encode(p.newPassword()));
        users.save(u);
    }

    @Transactional
    public UserDto updatePhoto(User u, MultipartFile file) {
        u.setPhotoUrl(storage.storePublic(file, "photos", StorageService.IMAGES));
        return mapper.user(users.save(u));
    }

    public static String temporaryPassword() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) sb.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        return sb.toString();
    }
}
