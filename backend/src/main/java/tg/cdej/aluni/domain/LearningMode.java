package tg.cdej.aluni.domain;

/**
 * Manière de suivre une formation.
 * <ul>
 * <li>{@link #SALLE} : cours donné par le formateur à l'Académie (support PDF), examen final lors d'une session
 * programmée par le formateur, une seule tentative.</li>
 * <li>{@link #EN_LIGNE} : l'apprenant suit les modules à son rythme ; l'examen final s'ouvre quand tous les modules
 * sont terminés, à tout moment, avec des tentatives illimitées jusqu'à la réussite.</li>
 * </ul>
 */
public enum LearningMode {
    SALLE,
    EN_LIGNE;

    /** Modalité d'une inscription (celle d'une inscription pas encore enregistrée est déduite du profil). */
    public static LearningMode defaultIfNull(Enrollment e) {
        return e.getMode() != null ? e.getMode() : defaultFor(e.getUser());
    }

    /** Les apprenants du CDEJ de Kpévé suivent en salle ; les autres CDEJ et les particuliers en ligne. */
    public static LearningMode defaultFor(User user) {
        return user != null && user.getProfileType() == ProfileType.INTERNE ? SALLE : EN_LIGNE;
    }
}
