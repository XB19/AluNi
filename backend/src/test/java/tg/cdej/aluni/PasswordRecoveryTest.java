package tg.cdej.aluni;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import tg.cdej.aluni.config.MessagingProperties;
import tg.cdej.aluni.service.MessageSender;

/** Mot de passe oublié : code envoyé par SMS ou e-mail, vérification, nouveau mot de passe ; secours par l'administrateur. */
class PasswordRecoveryTest extends IntegrationTest {

    /** Le vrai service d'envoi (canaux simulés en test), observé pour récupérer le code envoyé. */
    @MockitoSpyBean
    private MessageSender sender;

    private void register(String phone, String email) throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("profile", "particulier", "lastName", "Récupération", "firstName", "Ama",
                        "birthDate", "2000-01-01", "gender", "F", "phone", phone, "email", email, "password", "Ancien-2026"))))
                .andExpect(status().isCreated());
    }

    private void loginWith(String identifier, String password, int expected) throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", identifier, "password", password))))
                .andExpect(status().is(expected));
    }

    private static String sixDigits(String text) {
        Matcher m = Pattern.compile("\\b(\\d{6})\\b").matcher(text);
        assertThat(m.find()).as("code à 6 chiffres dans : %s", text).isTrue();
        return m.group(1);
    }

    @Test
    void channelsAreAnnounced() throws Exception {
        mvc.perform(get("/api/auth/channels"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sms").value(true))
                .andExpect(jsonPath("$.email").value(true));
    }

    @Test
    void smsCodeLetsTheUserChooseANewPassword() throws Exception {
        register("90111222", "ama.sms@exemple.tg");
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("channel", "sms", "identifier", "90 11 12 22"))))
                .andExpect(status().isOk());

        ArgumentCaptor<String> sms = ArgumentCaptor.forClass(String.class);
        verify(sender).deliverSms(eq("90111222"), sms.capture());
        String code = sixDigits(sms.getValue());
        String wrong = code.equals("000000") ? "111111" : "000000";

        mvc.perform(post("/api/auth/verify-code").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", "90111222", "code", wrong))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/verify-code").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", "90111222", "code", code))))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", "90111222", "code", code, "password", "Nouveau-2026"))))
                .andExpect(status().isOk());

        loginWith("90111222", "Ancien-2026", 401);
        loginWith("90111222", "Nouveau-2026", 200);
        // Le code ne sert qu'une fois
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", "90111222", "code", code, "password", "Encore-2026"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void emailCodeWorksToo() throws Exception {
        register("90333444", "ama.mail@exemple.tg");
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("channel", "email", "identifier", "Ama.Mail@exemple.tg"))))
                .andExpect(status().isOk());

        ArgumentCaptor<String> highlight = ArgumentCaptor.forClass(String.class);
        verify(sender).deliverEmail(eq("ama.mail@exemple.tg"), anyString(), anyString(), highlight.capture());
        String code = highlight.getValue();
        assertThat(code).matches("\\d{6}");

        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("identifier", "ama.mail@exemple.tg", "code", code, "password", "Courriel-2026"))))
                .andExpect(status().isOk());
        loginWith("ama.mail@exemple.tg", "Courriel-2026", 200);
    }

    @Test
    void unknownAccountsGetTheSameAnswer() throws Exception {
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("channel", "sms", "identifier", "99999998"))))
                .andExpect(status().isOk());
    }

    @Test
    void adminCanIssueATemporaryPassword() throws Exception {
        register("90555666", "ama.admin@exemple.tg");
        String admin = login("coordination@aluni.tg");
        String users = mvc.perform(get("/api/admin/users?role=apprenant&q=90555666").header("Authorization", admin))
                .andReturn().getResponse().getContentAsString();
        long id = read(users).get(0).get("id").asLong();

        String res = mvc.perform(post("/api/admin/users/" + id + "/reset-password").header("Authorization", admin))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String temp = read(res).get("tempPassword").asText();

        loginWith("90555666", "Ancien-2026", 401);
        loginWith("90555666", temp, 200);
        // Un apprenant ne peut pas réinitialiser le mot de passe d'un autre
        mvc.perform(post("/api/admin/users/" + id + "/reset-password").header("Authorization", login("kossi@exemple.tg")))
                .andExpect(status().isForbidden());
    }

    @Test
    void unconfiguredChannelsAreReportedAsUnavailable() {
        MessageSender off = new MessageSender(new MessagingProperties(null, null, false));
        assertThat(off.smsEnabled()).isFalse();
        assertThat(off.emailEnabled()).isFalse();
        assertThatThrownBy(() -> off.deliverSms("90000000", "test")).isInstanceOf(MessageSender.DeliveryException.class);
        assertThatThrownBy(() -> off.deliverEmail("a@b.tg", "s", "t", null)).isInstanceOf(MessageSender.DeliveryException.class);
    }
}
