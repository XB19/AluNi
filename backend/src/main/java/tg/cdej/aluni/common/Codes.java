package tg.cdej.aluni.common;

import java.util.Locale;

/**
 * Conversion entre les énumérations Java (AUTRE_CDEJ) et les codes échangés avec le frontend (autre-cdej).
 */
public final class Codes {

    private Codes() {
    }

    public static String of(Enum<?> value) {
        return value == null ? null : value.name().toLowerCase(Locale.ROOT).replace('_', '-');
    }

    public static <E extends Enum<E>> E parse(Class<E> type, String code) {
        if (code == null || code.isBlank()) return null;
        try {
            return Enum.valueOf(type, code.trim().toUpperCase(Locale.ROOT).replace('-', '_'));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Valeur invalide : " + code);
        }
    }

    public static <E extends Enum<E>> E require(Class<E> type, String code, String field) {
        E value = parse(type, code);
        if (value == null) throw ApiException.badRequest("Le champ « " + field + " » est obligatoire.");
        return value;
    }
}
