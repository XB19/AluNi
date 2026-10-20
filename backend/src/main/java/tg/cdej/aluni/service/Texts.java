package tg.cdej.aluni.service;

import java.text.Normalizer;
import java.util.Locale;

import tg.cdej.aluni.common.ApiException;

/** Outils de normalisation (téléphones togolais, e-mails, slugs). */
public final class Texts {

    private Texts() {
    }

    /** Renvoie le numéro sur 8 chiffres (sans +228), ou null si vide. */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() == 11 && digits.startsWith("228")) digits = digits.substring(3);
        if (digits.length() == 13 && digits.startsWith("00228")) digits = digits.substring(5);
        if (digits.length() != 8) throw ApiException.badRequest("Le numéro de téléphone doit contenir 8 chiffres.");
        return digits;
    }

    /** Format lisible : 90 11 22 33. */
    public static String display(String phone) {
        if (phone == null || phone.length() != 8) return phone;
        return phone.substring(0, 2) + " " + phone.substring(2, 4) + " " + phone.substring(4, 6) + " " + phone.substring(6);
    }

    public static String email(String raw) {
        return raw == null || raw.isBlank() ? null : raw.trim().toLowerCase(Locale.ROOT);
    }

    public static String slugify(String text) {
        String s = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (s.length() > 120) s = s.substring(0, 120).replaceAll("-$", "");
        return s.isEmpty() ? "element" : s;
    }
}
