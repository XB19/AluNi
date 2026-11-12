package tg.cdej.aluni.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Assistant de la plateforme (chatbot).
 *
 * @param apiKey          clé de l'API Claude (ANTHROPIC_API_KEY). Vide : l'assistant répond à partir de la FAQ.
 * @param model           modèle Claude utilisé
 * @param messagesPerHour nombre de messages autorisés par visiteur et par heure (protège le budget)
 */
@ConfigurationProperties("aluni.assistant")
public record AssistantProperties(String apiKey, String model, int messagesPerHour) {

    public AssistantProperties {
        if (model == null || model.isBlank()) model = "claude-opus-5-5";
        if (messagesPerHour <= 0) messagesPerHour = 30;
    }

    public boolean aiEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }
}
