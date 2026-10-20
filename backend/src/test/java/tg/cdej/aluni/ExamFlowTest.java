package tg.cdej.aluni;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import com.fasterxml.jackson.databind.JsonNode;

import tg.cdej.aluni.domain.Question;
import tg.cdej.aluni.domain.QuestionType;
import tg.cdej.aluni.repository.QuestionRepository;

class ExamFlowTest extends IntegrationTest {

    @Autowired
    private QuestionRepository questions;

    private long initiationExamId(String token) throws Exception {
        JsonNode exams = read(mvc.perform(get("/api/me/exams").header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (JsonNode e : exams) {
            if (e.get("exam").get("course").get("slug").asText().equals("initiation-informatique")) return e.get("exam").get("id").asLong();
        }
        throw new AssertionError("Examen introuvable");
    }

    @Test
    void passingTheExamIssuesAVerifiableCertificate() throws Exception {
        String token = login("90112233");
        long examId = initiationExamId(token);

        JsonNode state = read(mvc.perform(post("/api/exams/" + examId + "/attempts").header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(state.toString()).doesNotContain("correct").doesNotContain("accepted");
        String session = state.get("sessionToken").asText();
        long attemptId = state.get("attemptId").asLong();

        // Toutes les bonnes réponses
        Map<String, Object> answers = new HashMap<>();
        for (JsonNode q : state.get("questions")) {
            Question question = questions.findById(q.get("id").asLong()).orElseThrow();
            answers.put(q.get("id").asText(), question.getType() == QuestionType.COURTE
                    ? question.getAcceptedAnswers().get(0).toUpperCase() : question.getCorrectAnswers());
        }
        mvc.perform(put("/api/exam-attempts/" + attemptId).header("Authorization", token).header("X-Exam-Session", session)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("answers", answers, "currentIndex", 9))))
                .andExpect(status().isOk());

        // Une autre fenêtre ne peut pas répondre à la place de la session active
        mvc.perform(put("/api/exam-attempts/" + attemptId).header("Authorization", token).header("X-Exam-Session", "autre")
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("answers", Map.of()))))
                .andExpect(status().isConflict());

        JsonNode result = read(mvc.perform(post("/api/exam-attempts/" + attemptId + "/submit").header("Authorization", token)
                .header("X-Exam-Session", session)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(result.get("score").asInt()).isEqualTo(100);
        assertThat(result.get("passed").asBoolean()).isTrue();
        String code = result.get("certificate").get("code").asText();

        mvc.perform(get("/api/certificates/verify/" + code)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("valide"))
                .andExpect(jsonPath("$.mention").value("Excellent"));
        mvc.perform(get("/api/certificates/" + code + "/pdf").header("Authorization", token))
                .andExpect(status().isOk());

        // Déjà réussi : impossible de recommencer
        mvc.perform(post("/api/exams/" + examId + "/attempts").header("Authorization", token)).andExpect(status().isBadRequest());
    }

    @Test
    void lessonsUnlockModuleByModule() throws Exception {
        String token = login("91332211"); // Yawa : 2 leçons terminées sur le module 1
        JsonNode view = read(mvc.perform(get("/api/me/courses/initiation-informatique/learn").header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(view.get("modules").get(1).get("unlocked").asBoolean()).isFalse();
        long lockedLesson = view.get("modules").get(1).get("lessons").get(0).get("id").asLong();
        mvc.perform(post("/api/me/lessons/" + lockedLesson + "/complete").header("Authorization", token))
                .andExpect(status().isForbidden());

        for (JsonNode lesson : view.get("modules").get(0).get("lessons")) {
            mvc.perform(post("/api/me/lessons/" + lesson.get("id").asLong() + "/complete").header("Authorization", token))
                    .andExpect(status().isOk());
        }
        mvc.perform(post("/api/me/lessons/" + lockedLesson + "/complete").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progress").value(42));
    }

    @Test
    void certificateRevocationIsVisiblePublicly() throws Exception {
        String admin = login("coordination@aluni.tg");
        mvc.perform(post("/api/admin/certificates/ALUNI-2026-000148/revoke").header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("reason", "Test de révocation"))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/certificates/verify/ALUNI-2026-000148"))
                .andExpect(jsonPath("$.status").value("revoque"));
        mvc.perform(get("/api/certificates/verify/ALUNI-0000-000000")).andExpect(status().isNotFound());
    }

    @Test
    void trainerCannotEditSomeoneElsesCourse() throws Exception {
        String koffi = login("koffi@aluni.tg");
        JsonNode mine = read(mvc.perform(get("/api/trainer/courses").header("Authorization", koffi))
                .andReturn().getResponse().getContentAsString());
        List<String> slugs = mine.findValuesAsText("slug");
        assertThat(slugs).contains("initiation-informatique").doesNotContain("site-web-html-css");
    }
}
