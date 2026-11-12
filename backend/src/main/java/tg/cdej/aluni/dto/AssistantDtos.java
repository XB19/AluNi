package tg.cdej.aluni.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Échanges avec l'assistant de la plateforme. */
public final class AssistantDtos {

    private AssistantDtos() {
    }

    /** Un message de la conversation, tel qu'affiché dans la fenêtre de discussion. */
    public record ChatMessage(
            @Pattern(regexp = "user|assistant", message = "Rôle de message invalide.") String role,
            @NotBlank @Size(max = 4000) String content) {
    }

    /** La conversation en cours ; le dernier message est la question de la personne. */
    public record ChatRequest(@NotEmpty @Size(max = 40) List<@Valid ChatMessage> messages) {
    }

    /**
     * @param reply réponse à afficher (texte simple avec listes, **gras** et liens [texte](/chemin))
     * @param mode  "ia" (réponse rédigée par l'assistant) ou "faq" (réponse tirée de la FAQ)
     */
    public record ChatReply(String reply, String mode) {
    }

    /** @param ai true si l'assistant rédige ses réponses, false s'il s'appuie sur la FAQ. */
    public record AssistantStatus(boolean ai) {
    }
}
