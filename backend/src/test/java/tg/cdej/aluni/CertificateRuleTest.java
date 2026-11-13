package tg.cdej.aluni;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Un seul document délivré : le certificat de compétence, à la réussite de l'examen final (en ligne comme en salle).
 * Terminer les modules ne donne aucun document, et toute formation doit avoir un examen pour être publiée.
 */
class CertificateRuleTest extends IntegrationTest {

    private JsonNode certificatesOf(String token, String slug) throws Exception {
        JsonNode all = read(mvc.perform(get("/api/me/certificates").header("Authorization", token))
                .andReturn().getResponse().getContentAsString());
        return json.valueToTree(java.util.stream.StreamSupport.stream(all.spliterator(), false)
                .filter(c -> slug.equals(c.get("course").get("slug").asText())).toList());
    }

    @Test
    void finishingTheModulesGivesNoDocumentUntilTheExamIsPassed() throws Exception {
        // Nouvel apprenant (particulier, donc en ligne) inscrit à une formation à accès libre
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body(Map.of("profile", "particulier",
                "lastName", "Regle", "firstName", "Afi", "birthDate", "2001-03-03", "gender", "F", "phone", "90777888", "password", "Regle-2026"))))
                .andExpect(status().isCreated());
        String token = "Bearer " + read(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", "90777888", "password", "Regle-2026")))).andReturn().getResponse().getContentAsString())
                .get("token").asText();
        mvc.perform(post("/api/courses/securite-en-ligne/enroll").header("Authorization", token)).andExpect(status().isOk());
        JsonNode view = read(mvc.perform(get("/api/me/courses/securite-en-ligne/learn").header("Authorization", token))
                .andReturn().getResponse().getContentAsString());
        for (JsonNode module : view.get("modules")) {
            for (JsonNode lesson : module.get("lessons")) {
                mvc.perform(post("/api/me/lessons/" + lesson.get("id").asLong() + "/complete").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"completed\":true}")).andExpect(status().isOk());
            }
        }
        // 100 % des leçons : aucun document, et plus d'attestation à demander
        assertThat(certificatesOf(token, "securite-en-ligne")).isEmpty();
        mvc.perform(post("/api/me/courses/securite-en-ligne/attestation").header("Authorization", token))
                .andExpect(status().isBadRequest());

        // Examen réussi : certificat de compétence
        long examId = 0;
        for (JsonNode e : read(mvc.perform(get("/api/me/exams").header("Authorization", token)).andReturn().getResponse().getContentAsString())) {
            if ("securite-en-ligne".equals(e.get("exam").get("course").get("slug").asText())) examId = e.get("exam").get("id").asLong();
        }
        JsonNode state = read(mvc.perform(post("/api/exams/" + examId + "/attempts").header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        Map<String, Object> answers = new java.util.HashMap<>();
        for (JsonNode q : state.get("questions")) answers.put(q.get("id").asText(), correctAnswer(q.get("id").asLong()));
        String session = state.get("sessionToken").asText();
        long attempt = state.get("attemptId").asLong();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/exam-attempts/" + attempt)
                .header("Authorization", token).header("X-Exam-Session", session)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("answers", answers)))).andExpect(status().isOk());
        JsonNode result = read(mvc.perform(post("/api/exam-attempts/" + attempt + "/submit").header("Authorization", token)
                .header("X-Exam-Session", session)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(result.get("passed").asBoolean()).isTrue();

        JsonNode certs = certificatesOf(token, "securite-en-ligne");
        assertThat(certs).hasSize(1);
        assertThat(certs.get(0).get("type").asText()).isEqualTo("competence");
    }

    @Autowired
    private tg.cdej.aluni.repository.QuestionRepository questions;

    /** Bonne réponse d'une question (indices des bonnes options, ou première réponse acceptée). */
    private Object correctAnswer(long questionId) {
        var q = questions.findById(questionId).orElseThrow();
        return q.getAcceptedAnswers().isEmpty() ? q.getCorrectAnswers() : q.getAcceptedAnswers().get(0);
    }

    @Test
    void aCourseCannotBePublishedWithoutItsFinalExam() throws Exception {
        String koffi = login("koffi@aluni.tg");
        JsonNode created = read(mvc.perform(post("/api/trainer/courses").header("Authorization", koffi).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("title", "Formation sans examen", "short", "Résumé", "description", "Description", "category", "bureautique",
                        "level", "Débutant", "hours", 4, "weeks", 1, "certTypes", List.of("attestation"), "access", "libre",
                        "modules", List.of(Map.of("title", "Module", "lessons", List.of(Map.of("title", "Leçon", "type", "texte", "content", "<p>x</p>"))))))))
                .andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString());
        // Quel que soit le type demandé, la formation délivre le certificat de compétence
        assertThat(created.get("certTypes").get(0).asText()).isEqualTo("competence");
        mvc.perform(post("/api/trainer/courses/" + created.get("id").asLong() + "/publish").header("Authorization", koffi))
                .andExpect(status().isBadRequest());
    }
}
