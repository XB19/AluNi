package tg.cdej.aluni.domain;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Examen final d'une formation (donne droit au certificat de compétence). */
@Entity
@Table(name = "exams")
@Getter
@Setter
@NoArgsConstructor
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Course course;

    @Column(nullable = false, length = 200)
    private String title;

    private int durationMin = 20;

    private int questionCount = 10;

    private boolean randomize = true;

    private int passMark = 60;

    private int attemptsAllowed = 2;

    private LocalDate opensAt;

    private LocalDate closesAt;

    private boolean showCorrection = true;

    /** Examen accessible uniquement depuis les postes de la salle de l'Académie. */
    private boolean roomOnly;

    /** Le certificat n'est délivré qu'après validation par l'administrateur. */
    private boolean requiresAdminValidation;

    @ManyToMany
    @JoinTable(name = "exam_questions",
            joinColumns = @JoinColumn(name = "exam_id"),
            inverseJoinColumns = @JoinColumn(name = "question_id"))
    private List<Question> questions = new ArrayList<>();

    public boolean isOpen(LocalDate today) {
        return (opensAt == null || !today.isBefore(opensAt)) && (closesAt == null || !today.isAfter(closesAt));
    }
}
