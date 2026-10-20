package tg.cdej.aluni;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AuthAndSecurityTest extends IntegrationTest {

    @Test
    void registerThenLoginWithPhone() throws Exception {
        String res = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("profile", "particulier", "lastName", "Doe", "firstName", "Ama",
                        "birthDate", "2005-04-12", "gender", "F", "phone", "+228 99 11 22 33", "password", "MotDePasse1"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.profile").value("particulier"))
                .andReturn().getResponse().getContentAsString();
        assertThat(read(res).get("token").asText()).isNotBlank();

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", "99112233", "password", "MotDePasse1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.phone").value("99 11 22 33"));
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", "kossi@exemple.tg", "password", "mauvais"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Identifiant ou mot de passe incorrect."));
    }

    @Test
    void trainerAccountWaitsForValidation() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("profile", "formateur", "speciality", "Photographie", "lastName", "Formateur",
                        "firstName", "Test", "birthDate", "1990-01-01", "gender", "M", "email", "formateur.test@exemple.tg",
                        "password", "MotDePasse1"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pending").value(true));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", "formateur.test@exemple.tg", "password", "MotDePasse1"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidRegistrationReturnsFieldErrors() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("profile", "interne", "lastName", "", "firstName", "A", "birthDate", "2005-01-01",
                        "gender", "F", "phone", "90000001", "password", "court"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.lastName").exists())
                .andExpect(jsonPath("$.fields.password").exists());
    }

    @Test
    void rolesAreEnforced() throws Exception {
        mvc.perform(get("/api/me/enrollments")).andExpect(status().isUnauthorized());
        String learner = login("kossi@exemple.tg");
        mvc.perform(get("/api/admin/dashboard").header("Authorization", learner)).andExpect(status().isForbidden());
        mvc.perform(get("/api/trainer/dashboard").header("Authorization", learner)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/dashboard").header("Authorization", login("coordination@aluni.tg"))).andExpect(status().isOk());
    }

    @Test
    void publicCatalogIsOpen() throws Exception {
        mvc.perform(get("/api/courses")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(9));
        mvc.perform(get("/api/courses/initiation-informatique")).andExpect(status().isOk())
                .andExpect(jsonPath("$.modules.length()").value(3))
                .andExpect(jsonPath("$.exam.questionCount").value(10));
        mvc.perform(get("/api/courses/powerpoint-presentations")).andExpect(status().isNotFound());
    }
}
