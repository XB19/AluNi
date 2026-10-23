package tg.cdej.aluni.seed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import tg.cdej.aluni.domain.AccountStatus;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.repository.UserRepository;

/**
 * Crée le premier compte administrateur au démarrage (production, sans données de démonstration),
 * à partir des variables ADMIN_EMAIL et ADMIN_PASSWORD. Sans effet si un administrateur existe déjà.
 */
@Component
@Order(2)
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;
    private final String firstName;
    private final String lastName;

    public AdminBootstrap(UserRepository users, PasswordEncoder encoder,
            @Value("${aluni.admin-email:}") String email,
            @Value("${aluni.admin-password:}") String password,
            @Value("${aluni.admin-first-name:Administrateur}") String firstName,
            @Value("${aluni.admin-last-name:ALuNI}") String lastName) {
        this.users = users;
        this.encoder = encoder;
        this.email = email == null ? "" : email.trim().toLowerCase();
        this.password = password == null ? "" : password;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.countByRole(Role.ADMIN) > 0) return;
        if (email.isBlank() || password.isBlank()) {
            log.warn("Aucun compte administrateur : renseignez ADMIN_EMAIL et ADMIN_PASSWORD pour en créer un au démarrage.");
            return;
        }
        if (password.length() < 8) {
            log.warn("ADMIN_PASSWORD doit contenir au moins 8 caractères : compte administrateur non créé.");
            return;
        }
        if (users.existsByEmailIgnoreCase(email)) {
            log.warn("L'adresse {} est déjà utilisée par un compte non administrateur : compte administrateur non créé.", email);
            return;
        }
        User admin = new User();
        admin.setFirstName(firstName);
        admin.setLastName(lastName);
        admin.setEmail(email);
        admin.setPasswordHash(encoder.encode(password));
        admin.setRole(Role.ADMIN);
        admin.setStatus(AccountStatus.ACTIF);
        users.save(admin);
        log.info("Compte administrateur créé : {}", email);
    }
}
