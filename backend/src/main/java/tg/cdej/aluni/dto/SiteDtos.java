package tg.cdej.aluni.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class SiteDtos {

    private SiteDtos() {
    }

    public record NewsDto(Long id, String slug, String title, LocalDate date, String category, String excerpt,
            List<String> body, String image, boolean published) {
    }

    public record NewsRequest(
            @NotBlank(message = "Le titre est obligatoire.") @Size(max = 200) String title,
            @Size(max = 60) String category,
            @Size(max = 500) String excerpt,
            String body,
            LocalDate date,
            String image,
            boolean published) {
    }

    public record PartnerDto(Long id, String name, String logo, String website) {
    }

    public record PartnerRequest(@NotBlank @Size(max = 160) String name, String logo, String website) {
    }

    public record FaqDto(Long id, String q, String a, String tag) {
    }

    public record FaqRequest(@NotBlank @Size(max = 300) String q, @NotBlank String a, @Size(max = 60) String tag) {
    }

    public record ContactRequest(
            @NotBlank(message = "Votre nom est obligatoire.") @Size(max = 160) String name,
            @Size(max = 30) String phone,
            @Email(message = "Adresse e-mail invalide") @Size(max = 160) String email,
            @Size(max = 120) String subject,
            @NotBlank(message = "Le message est obligatoire.") @Size(max = 5000) String message) {
    }

    public record ContactMessageDto(Long id, String name, String phone, String email, String subject, String message,
            Instant date, boolean handled) {
    }
}
