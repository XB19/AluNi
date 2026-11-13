package tg.cdej.aluni;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import tg.cdej.aluni.service.AssistantService;

/** Assistant de la plateforme : sans clé d'API (tests), il répond à partir de la FAQ, pour les visiteurs comme pour les connectés. */
class AssistantTest extends IntegrationTest {

    @Autowired
    private AssistantService assistant;

    private ResultActions ask(String ip, List<Map<String, String>> messages) throws Exception {
        return mvc.perform(post("/api/assistant/chat").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("messages", messages)))
                .with(r -> { r.setRemoteAddr(ip); return r; }));
    }

    private static List<Map<String, String>> question(String text) {
        return List.of(Map.of("role", "user", "content", text));
    }

    @Test
    void statusTellsWhetherAnswersAreWrittenByTheAi() throws Exception {
        mvc.perform(get("/api/assistant/status")).andExpect(status().isOk()).andExpect(jsonPath("$.ai").value(false));
    }

    @Test
    void visitorsGetTheClosestFaqAnswer() throws Exception {
        ask("10.0.0.1", question("J'ai oublié mon mdp, comment faire ?"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("faq"))
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("Mot de passe oublié")));
        ask("10.0.0.1", question("Comment un employeur vérifie mon certificat ?"))
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("QR code")));
    }

    @Test
    void unrelatedQuestionsPointToTheFaqAndContact() throws Exception {
        ask("10.0.0.2", question("Quelle est la capitale de l'Australie ?"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(org.hamcrest.Matchers.containsString("/contact")));
    }

    @Test
    void conversationMustEndWithAQuestion() throws Exception {
        ask("10.0.0.3", List.of(Map.of("role", "assistant", "content", "Bonjour !"))).andExpect(status().isBadRequest());
        ask("10.0.0.3", question("x".repeat(1200))).andExpect(status().isBadRequest());
    }

    /** Pose la question avec le profil donné (null = visiteur) et renvoie la réponse. */
    private String answer(String token, String text) throws Exception {
        var req = post("/api/assistant/chat").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("messages", question(text))))
                .with(r -> { r.setRemoteAddr("10.1.0." + Math.abs(text.hashCode() % 250)); return r; });
        if (token != null) req.header("Authorization", token);
        return read(mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("reply").asText();
    }

    /** Chaque profil reçoit la réponse de son espace : questions proposées par l'assistant et formulations libres. */
    @Test
    void answersFollowTheConnectedProfile() throws Exception {
        String trainer = login("koffi@aluni.tg");
        String learner = login("kossi@exemple.tg");
        String admin = login("coordination@aluni.tg");
        Map<String, Map<String, String>> expected = new java.util.LinkedHashMap<>();
        expected.put(null, Map.of(
                "Comment créer un compte ?", "**Créer un compte**",
                "En ligne ou en salle : quelle différence ?", "**En ligne ou en salle**",
                "Comment obtenir un certificat ?", "**Obtenir un certificat**",
                "J'ai oublié mon mot de passe", "Mot de passe oublié",
                "Comment devenir formateur ?", "**Les formateurs de l'Académie**"));
        expected.put(learner, Map.of(
                "Comment passer mon examen final ?", "**Passer l'examen final**",
                "Où télécharger mon certificat ?", "**Télécharger mon certificat**",
                "Ma demande d'inscription est en attente", "**Inscription en attente**",
                "Je suis en salle ou en ligne ?", "**Ma modalité (en ligne ou en salle)**",
                "J'ai raté l'examen, je peux le repasser ?", "**Résultat et nouvelle tentative**"));
        expected.put(trainer, Map.of(
                "Comment suivre mes apprenants ?", "**Suivre mes apprenants**",
                "Comment publier une formation ?", "**Créer et publier une formation**",
                "Comment importer des questions ?", "**Importer des questions**",
                "Comment programmer une session d'examen en salle ?", "**Programmer une session d'examen en salle**",
                "Comment voir les notes de mes élèves ?", "**Suivre mes apprenants**"));
        expected.put(admin, Map.of(
                "Comment créer un compte formateur ?", "**Créer un compte formateur**",
                "Comment valider une demande d'inscription ?", "**Valider une inscription**",
                "Comment révoquer un certificat ?", "**Gérer les certificats**",
                "Comment modifier la FAQ ?", "**Modifier le site vitrine**"));
        for (var byProfile : expected.entrySet()) {
            for (var qa : byProfile.getValue().entrySet()) {
                assertThat(answer(byProfile.getKey(), qa.getKey())).as(qa.getKey()).contains(qa.getValue());
            }
        }
        // Une fonction d'un autre profil est signalée comme telle, jamais présentée comme accessible
        assertThat(answer(learner, "Comment programmer une session d'examen en salle ?")).startsWith("Cette fonction se trouve dans l'espace formateur");
        assertThat(answer(learner, "Comment suivre mes apprenants ?")).startsWith("Cette fonction se trouve dans l'espace formateur")
                .contains("**Suivre mes apprenants**");
        assertThat(answer(null, "Comment valider une demande d'inscription ?")).startsWith("Cette fonction est réservée à l'administration");
    }

    @Test
    void eachVisitorHasAnHourlyQuota() throws Exception {
        for (int i = 0; i < 40; i++) ask("10.0.0.4", question("Comment m'inscrire ?")).andExpect(status().isOk());
        ask("10.0.0.4", question("Comment m'inscrire ?")).andExpect(status().isTooManyRequests());
        // Un autre visiteur n'est pas concerné
        ask("10.0.0.5", question("Comment m'inscrire ?")).andExpect(status().isOk());
    }

    @Test
    void liveDataContainsContactsFaqAndPublishedCourses() {
        String data = assistant.liveData();
        assertThat(data).contains("CDEJ Lumière de Kpévé", "Q : Qui peut s'inscrire sur la plateforme ?", "](/formations/");
    }
}
