package tg.cdej.aluni.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Message envoyé depuis le formulaire de contact. */
@Entity
@Table(name = "contact_messages")
@Getter
@Setter
@NoArgsConstructor
public class ContactMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 30)
    private String phone;

    @Column(length = 160)
    private String email;

    @Column(length = 120)
    private String subject;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    private boolean handled;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
