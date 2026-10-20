package tg.cdej.aluni.domain;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Actualité ou événement publié sur le site vitrine. */
@Entity
@Table(name = "news")
@Getter
@Setter
@NoArgsConstructor
public class News {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 200)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 60)
    private String category;

    @Column(length = 500)
    private String excerpt;

    /** Paragraphes séparés par une ligne vide. */
    @Column(columnDefinition = "text")
    private String body;

    private String imageUrl;

    @Column(nullable = false)
    private LocalDate publishedAt;

    private boolean published;
}
