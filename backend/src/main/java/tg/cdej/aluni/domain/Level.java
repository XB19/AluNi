package tg.cdej.aluni.domain;

import tg.cdej.aluni.common.ApiException;

public enum Level {
    DEBUTANT("Débutant"),
    INTERMEDIAIRE("Intermédiaire"),
    AVANCE("Avancé");

    private final String label;

    Level(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static Level fromLabel(String value) {
        for (Level l : values()) {
            if (l.label.equalsIgnoreCase(value) || l.name().equalsIgnoreCase(value)) return l;
        }
        throw ApiException.badRequest("Niveau inconnu : " + value);
    }
}
