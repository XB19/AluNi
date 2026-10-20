package tg.cdej.aluni.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import tg.cdej.aluni.common.ApiException;

/** Bloque temporairement un identifiant après trop d'échecs de connexion (protection contre les essais en série). */
@Service
public class LoginAttemptService {

    private static final int MAX_FAILURES = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private record Entry(int failures, Instant lockedUntil) {
    }

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    public void checkNotLocked(String key) {
        Entry e = entries.get(key);
        if (e != null && e.lockedUntil() != null && e.lockedUntil().isAfter(Instant.now())) {
            long minutes = Math.max(1, Duration.between(Instant.now(), e.lockedUntil()).toMinutes());
            throw ApiException.forbidden("Trop de tentatives. Réessayez dans " + minutes + " minute(s).");
        }
    }

    public void failed(String key) {
        entries.compute(key, (k, e) -> {
            int failures = (e == null || (e.lockedUntil() != null && e.lockedUntil().isBefore(Instant.now()))) ? 1 : e.failures() + 1;
            return new Entry(failures, failures >= MAX_FAILURES ? Instant.now().plus(LOCK_DURATION) : null);
        });
    }

    public void succeeded(String key) {
        entries.remove(key);
    }
}
