package tg.cdej.aluni.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.domain.AccountStatus;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.repository.UserRepository;

/** Accès à l'utilisateur connecté. Un compte suspendu perd l'accès immédiatement, même avec un jeton valide. */
@Component
public class CurrentUser {

    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public Long id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwt)) throw ApiException.unauthorized("Veuillez vous connecter pour continuer.");
        return Long.valueOf(jwt.getToken().getSubject());
    }

    public User get() {
        User user = users.findById(id()).orElseThrow(() -> ApiException.unauthorized("Compte introuvable."));
        if (user.getStatus() != AccountStatus.ACTIF) throw ApiException.forbidden("Votre compte n'est pas actif.");
        return user;
    }

    public User require(Role role) {
        User user = get();
        if (user.getRole() != role) throw ApiException.forbidden("Cette action est réservée au profil " + role.name().toLowerCase() + ".");
        return user;
    }

    public boolean isAdmin(User user) {
        return user.getRole() == Role.ADMIN;
    }
}
