package tg.cdej.aluni;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import com.fasterxml.jackson.databind.JsonNode;

import tg.cdej.aluni.domain.ExamSession;
import tg.cdej.aluni.domain.Question;
import tg.cdej.aluni.domain.QuestionType;
import tg.cdej.aluni.repository.ExamRepository;
import tg.cdej.aluni.repository.ExamSessionRepository;
import tg.cdej.aluni.repository.QuestionRepository;
import tg.cdej.aluni.service.Mapper;

class ExamFlowTest extends IntegrationTest {

    @Autowired
    private QuestionRepository questions;

    @Autowired
    private ExamRepository exams;

    @Autowired
    private ExamSessionRepository examSessions;

    private long initiationExamId(String token) throws Exception {
        JsonNode exams = read(mvc.perform(get("/api/me/exams").header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (JsonNode e : exams) {
            if (e.get("exam").get("course").get("slug").asText().equals("initiation-informatique")) return e.get("exam").get("id").asLong();
        }
        throw new AssertionError("Examen introuvable");
    }

    private long examIdOf(String token, String slug) throws Exception {
        JsonNode exams = read(mvc.perform(get("/api/me/exams").header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (JsonNode e : exams) {
            if (e.get("exam").get("course").get("slug").asText().equals(slug)) return e.get("exam").get("id").asLong();
        }
        throw new AssertionError("Examen introuvable : " + slug);
    }

    /** Ouvre une session d'examen en salle en cours (comme si le formateur l'avait programmée pour maintenant). */
    private void openRoomSession(String token, String slug) throws Exception {
        long examId = examIdOf(token, slug);
        ExamSession s = new ExamSession();
        s.setExam(exams.findById(examId).orElseThrow());
        s.setStartsAt(Instant.now().minusSeconds(60));
        s.setEndsAt(Instant.now().plusSeconds(7200));
        examSessions.save(s);
    }

    private JsonNode myExam(String token, String slug) throws Exception {
        JsonNode list = read(mvc.perform(get("/api/me/exams").header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (JsonNode e : list) if (e.get("exam").get("course").get("slug").asText().equals(slug)) return e;
        throw new AssertionError("Examen introuvable : " + slug);
    }

    /** Démarre une tentative et la soumet sans réponse (échec). */
    private JsonNode failAttempt(String token, long examId) throws Exception {
        JsonNode state = read(mvc.perform(post("/api/exams/" + examId + "/attempts").header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        return read(mvc.perform(post("/api/exam-attempts/" + state.get("attemptId").asLong() + "/submit").header("Authorization", token)
                .header("X-Exam-Session", state.get("sessionToken").asText())).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    @Test
    void onlineLearnersFollowModulesInOrderBeforeTheExam() throws Exception {
        String token = login("93456789"); // Komlan (autre CDEJ) : en ligne, « Créer son premier site web » en cours
        assertThat(myExam(token, "site-web-html-css").get("mode").asText()).isEqualTo("en-ligne");
        mvc.perform(post("/api/exams/" + examIdOf(token, "site-web-html-css") + "/attempts").header("Authorization", token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Terminez d'abord toutes les leçons")));

        JsonNode view = read(mvc.perform(get("/api/me/courses/site-web-html-css/learn").header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(view.get("mode").asText()).isEqualTo("en-ligne");
        int locked = 0;
        while (view.get("modules").get(locked).get("unlocked").asBoolean()) locked++;
        long lockedLesson = view.get("modules").get(locked).get("lessons").get(0).get("id").asLong();
        mvc.perform(post("/api/me/lessons/" + lockedLesson + "/complete").header("Authorization", token))
                .andExpect(status().isForbidden());
        for (JsonNode lesson : view.get("modules").get(locked - 1).get("lessons")) {
            mvc.perform(post("/api/me/lessons/" + lesson.get("id").asLong() + "/complete").header("Authorization", token))
                    .andExpect(status().isOk());
        }
        mvc.perform(post("/api/me/lessons/" + lockedLesson + "/complete").header("Authorization", token))
                .andExpect(status().isOk());
    }

    @Test
    void onlineLearnersCanRetryUntilTheyPass() throws Exception {
        String token = login("99876543"); // Edem (particulier) : en ligne, formation terminée, examen Excel échoué (52/100)
        JsonNode exam = myExam(token, "excel-gestion");
        assertThat(exam.get("mode").asText()).isEqualTo("en-ligne");
        assertThat(exam.path("attemptsLeft").isNumber()).isFalse(); // illimitées (champ absent)
        assertThat(exam.get("canStart").asBoolean()).isTrue();
        long examId = exam.get("exam").get("id").asLong();

        JsonNode second = failAttempt(token, examId);
        assertThat(second.get("passed").asBoolean()).isFalse();
        assertThat(second.get("canRetry").asBoolean()).isTrue();
        // Aucun délai : nouvelle tentative immédiate
        assertThat(failAttempt(token, examId).get("canRetry").asBoolean()).isTrue();
        assertThat(myExam(token, "excel-gestion").get("attempts").size()).isEqualTo(3);
    }

    @Test
    void roomLearnersTakeTheExamOnceDuringTheTrainerSession() throws Exception {
        String token = login("91332211"); // Yawa (CDEJ interne) : en salle, 2 leçons seulement
        JsonNode exam = myExam(token, "initiation-informatique");
        assertThat(exam.get("mode").asText()).isEqualTo("salle");
        assertThat(exam.get("canStart").asBoolean()).isFalse();
        assertThat(exam.path("nextSession").isObject()).isTrue(); // session programmée dans une semaine
        assertThat(exam.get("blockedReason").asText()).contains("L'examen aura lieu");
        long examId = exam.get("exam").get("id").asLong();
        mvc.perform(post("/api/exams/" + examId + "/attempts").header("Authorization", token)).andExpect(status().isForbidden());

        // Session ouverte : l'apprenante compose sans avoir suivi les leçons en ligne (cours donné en salle)
        openRoomSession(token, "initiation-informatique");
        JsonNode view = read(mvc.perform(get("/api/me/courses/initiation-informatique/learn").header("Authorization", token))
                .andReturn().getResponse().getContentAsString());
        assertThat(view.get("modules")).allSatisfy(m -> assertThat(m.get("unlocked").asBoolean()).isTrue());
        JsonNode result = failAttempt(token, examId);
        assertThat(result.get("canRetry").asBoolean()).isFalse();
        assertThat(result.get("attemptsLeft").asInt()).isZero();
        mvc.perform(post("/api/exams/" + examId + "/attempts").header("Authorization", token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("une seule tentative")));
    }

    @Test
    void trainerSchedulesSessionsAndSwitchesLearnerMode() throws Exception {
        String koffi = login("koffi@aluni.tg");
        JsonNode mine = read(mvc.perform(get("/api/trainer/courses").header("Authorization", koffi))
                .andReturn().getResponse().getContentAsString());
        long initiation = 0;
        for (JsonNode c : mine) if (c.get("slug").asText().equals("initiation-informatique")) initiation = c.get("id").asLong();
        String tomorrow = java.time.LocalDate.now(Mapper.ZONE).plusDays(1).toString();
        String yesterday = java.time.LocalDate.now(Mapper.ZONE).minusDays(1).toString();

        JsonNode created = read(mvc.perform(post("/api/trainer/courses/" + initiation + "/exam/sessions").header("Authorization", koffi)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("date", tomorrow, "start", "09:00", "end", "11:00"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(post("/api/trainer/courses/" + initiation + "/exam/sessions").header("Authorization", koffi)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("date", yesterday, "start", "09:00", "end", "11:00"))))
                .andExpect(status().isBadRequest()); // créneau passé
        mvc.perform(post("/api/trainer/courses/" + initiation + "/exam/sessions").header("Authorization", koffi)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("date", tomorrow, "start", "09:00", "end", "09:10"))))
                .andExpect(status().isBadRequest()); // plus court que l'examen (20 min)
        mvc.perform(delete("/api/trainer/exam-sessions/" + created.get("id").asLong()).header("Authorization", koffi))
                .andExpect(status().isOk());

        // Essi (CDEJ interne, en salle par défaut) passe en ligne
        JsonNode learners = read(mvc.perform(get("/api/trainer/learners").header("Authorization", koffi))
                .andReturn().getResponse().getContentAsString());
        long essiEnrollment = 0;
        for (JsonNode l : learners) {
            if (l.get("name").asText().startsWith("Essi") && l.get("course").get("slug").asText().equals("initiation-informatique")) {
                assertThat(l.get("mode").asText()).isEqualTo("salle");
                essiEnrollment = l.get("enrollmentId").asLong();
            }
        }
        mvc.perform(patch("/api/trainer/enrollments/" + essiEnrollment + "/mode").header("Authorization", koffi)
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("mode", "en-ligne"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.mode").value("en-ligne"));
        assertThat(myExam(login("90221100"), "initiation-informatique").get("mode").asText()).isEqualTo("en-ligne");
        // Un formateur ne modifie pas les apprenants d'une formation qui n'est pas la sienne
        mvc.perform(patch("/api/trainer/enrollments/" + essiEnrollment + "/mode").header("Authorization", login("ama@aluni.tg"))
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("mode", "salle"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void passingTheExamIssuesAVerifiableCertificate() throws Exception {
        String token = login("90112233"); // Kossi (CDEJ interne) : en salle
        long examId = initiationExamId(token);

        openRoomSession(token, "initiation-informatique");

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

    @Test
    void trainerPublishesDirectlyWithoutAdminValidation() throws Exception {
        String koffi = login("koffi@aluni.tg");
        JsonNode mine = read(mvc.perform(get("/api/trainer/courses").header("Authorization", koffi))
                .andReturn().getResponse().getContentAsString());
        long powerpoint = 0;
        for (JsonNode c : mine) if (c.get("slug").asText().equals("powerpoint-presentations")) powerpoint = c.get("id").asLong();
        mvc.perform(get("/api/courses/powerpoint-presentations")).andExpect(status().isNotFound()); // brouillon : invisible

        mvc.perform(post("/api/trainer/courses/" + powerpoint + "/publish").header("Authorization", koffi))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("publiee"));
        // Visible immédiatement dans le catalogue public, sans passer par l'administration
        mvc.perform(get("/api/courses/powerpoint-presentations")).andExpect(status().isOk());
        assertThat(mvc.perform(get("/api/courses")).andReturn().getResponse().getContentAsString()).contains("powerpoint-presentations");
        mvc.perform(post("/api/trainer/courses/" + powerpoint + "/publish").header("Authorization", koffi))
                .andExpect(status().isBadRequest());
    }
}
