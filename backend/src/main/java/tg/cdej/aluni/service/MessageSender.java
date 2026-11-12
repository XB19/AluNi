package tg.cdej.aluni.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.HtmlUtils;

import jakarta.mail.internet.MimeMessage;
import tg.cdej.aluni.config.MessagingProperties;
import tg.cdej.aluni.domain.User;

/**
 * Envoi des messages : codes de récupération, identifiants des nouveaux comptes, notifications de compte.
 * <ul>
 * <li>SMS par Twilio, dès que TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM sont renseignés ;</li>
 * <li>e-mails par SMTP (Gmail ou autre), dès que MAIL_HOST et MAIL_FROM sont renseignés ; ils partent en HTML aux
 * couleurs d'ALuNI, avec une version texte.</li>
 * </ul>
 * Les méthodes {@code deliver…} envoient tout de suite et signalent un échec (codes de récupération) ; les méthodes
 * {@code send…} et {@link #notifyUser} envoient en arrière-plan et journalisent les échecs.
 */
@Service
public class MessageSender {

    private static final Logger log = LoggerFactory.getLogger(MessageSender.class);

    private final MessagingProperties props;
    private final JavaMailSenderImpl mail;
    private final RestClient twilio;

    public MessageSender(MessagingProperties props) {
        this.props = props;
        this.mail = props.mail().configured() ? mailSender(props.mail()) : null;
        this.twilio = RestClient.builder().baseUrl("https://api.twilio.com/2010-04-01").build();
    }

    // ------------------------------------------------------------ Canaux disponibles

    public boolean smsEnabled() {
        return props.twilio().configured() || props.logOnly();
    }

    public boolean emailEnabled() {
        return mail != null || props.logOnly();
    }

    // ------------------------------------------------------------ Envoi immédiat (erreur remontée)

    /** Envoie un SMS au numéro togolais (8 chiffres) ou international (+…). */
    public void deliverSms(String phone, String text) {
        String to = e164(phone);
        if (!props.twilio().configured()) {
            if (!props.logOnly()) throw new DeliveryException("Aucun fournisseur SMS n'est configuré.");
            log.info("[SMS simulé → {}] {}", to, text);
            return;
        }
        MessagingProperties.Twilio t = props.twilio();
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("To", to);
        form.add(t.from().startsWith("MG") ? "MessagingServiceSid" : "From", t.from());
        form.add("Body", text);
        String auth = Base64.getEncoder().encodeToString((t.accountSid() + ":" + t.authToken()).getBytes(StandardCharsets.UTF_8));
        try {
            twilio.post().uri("/Accounts/{sid}/Messages.json", t.accountSid())
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + auth)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .toBodilessEntity();
            log.info("SMS envoyé à {}", mask(to));
        } catch (RestClientResponseException e) {
            log.warn("Twilio a refusé le SMS pour {} ({}) : {}", mask(to), e.getStatusCode(), e.getResponseBodyAsString());
            throw new DeliveryException("Le SMS n'a pas pu être envoyé.", e);
        } catch (Exception e) {
            log.warn("Envoi du SMS à {} impossible : {}", mask(to), e.getMessage());
            throw new DeliveryException("Le SMS n'a pas pu être envoyé.", e);
        }
    }

    /** Envoie un e-mail HTML (avec version texte). {@code highlight} : code ou identifiants mis en valeur. */
    public void deliverEmail(String to, String subject, String text, String highlight) {
        if (mail == null) {
            if (!props.logOnly()) throw new DeliveryException("Aucun serveur d'envoi d'e-mails n'est configuré.");
            log.info("[E-mail simulé → {}] {} : {}", to, subject, text);
            return;
        }
        try {
            MimeMessage message = mail.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            MessagingProperties.Mail m = props.mail();
            helper.setFrom(m.from(), m.fromName() == null || m.fromName().isBlank() ? "ALuNI" : m.fromName());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, html(subject, text, highlight));
            mail.send(message);
            log.info("E-mail « {} » envoyé à {}", subject, mask(to));
        } catch (Exception e) {
            log.warn("Envoi de l'e-mail à {} impossible : {}", mask(to), e.getMessage());
            throw new DeliveryException("L'e-mail n'a pas pu être envoyé.", e);
        }
    }

    // ------------------------------------------------------------ Envoi en arrière-plan

    @Async
    public void sendSms(String phone, String text) {
        try {
            deliverSms(phone, text);
        } catch (DeliveryException e) {
            log.warn("SMS non envoyé : {}", e.getMessage());
        }
    }

    @Async
    public void sendEmail(String to, String subject, String text) {
        try {
            deliverEmail(to, subject, text, null);
        } catch (DeliveryException e) {
            log.warn("E-mail non envoyé : {}", e.getMessage());
        }
    }

    /** Prévient un utilisateur par le canal disponible : SMS s'il a un téléphone, sinon e-mail. */
    @Async
    public void notifyUser(User u, String subject, String text, String highlight) {
        try {
            if (u.getPhone() != null && smsEnabled()) {
                deliverSms(u.getPhone(), text);
            } else if (u.getEmail() != null && emailEnabled()) {
                deliverEmail(u.getEmail(), subject, text, highlight);
            } else {
                log.info("Aucun canal d'envoi disponible pour prévenir {} ({})", u.fullName(), subject);
            }
        } catch (DeliveryException e) {
            log.warn("Message « {} » non envoyé à {} : {}", subject, u.fullName(), e.getMessage());
        }
    }

    // ------------------------------------------------------------ Outils

    /** 8 chiffres togolais → +228XXXXXXXX ; un numéro déjà international est conservé. */
    static String e164(String phone) {
        String p = phone.replaceAll("[\\s.-]", "");
        if (p.startsWith("+")) return p;
        if (p.startsWith("00")) return "+" + p.substring(2);
        if (p.length() == 8) return "+228" + p;
        return "+" + p;
    }

    private static String mask(String value) {
        if (value == null || value.length() < 5) return "***";
        int at = value.indexOf('@');
        return at > 1 ? value.charAt(0) + "***" + value.substring(at) : "***" + value.substring(value.length() - 3);
    }

    private static JavaMailSenderImpl mailSender(MessagingProperties.Mail m) {
        JavaMailSenderImpl s = new JavaMailSenderImpl();
        s.setHost(m.host());
        s.setPort(m.port());
        s.setUsername(m.username());
        s.setPassword(m.password());
        s.setDefaultEncoding("UTF-8");
        Properties p = s.getJavaMailProperties();
        p.put("mail.smtp.auth", String.valueOf(m.username() != null && !m.username().isBlank()));
        if (m.port() == 465) {
            p.put("mail.smtp.ssl.enable", "true");
        } else {
            p.put("mail.smtp.starttls.enable", "true");
        }
        p.put("mail.smtp.connectiontimeout", "10000");
        p.put("mail.smtp.timeout", "15000");
        p.put("mail.smtp.writetimeout", "15000");
        return s;
    }

    /** Gabarit HTML sobre aux couleurs d'ALuNI (compatible avec les messageries courantes). */
    static String html(String title, String text, String highlight) {
        String body = HtmlUtils.htmlEscape(text).replace("\n", "<br>");
        String box = highlight == null ? "" : """
                <div style="margin:24px 0;padding:18px;border-radius:12px;background:#eef3fb;text-align:center;\
                font-size:30px;font-weight:800;letter-spacing:8px;color:#1b335d">%s</div>""".formatted(HtmlUtils.htmlEscape(highlight));
        return """
                <!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f2f4f8;font-family:Arial,Helvetica,sans-serif;color:#161b26">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center">
                <table role="presentation" width="100%%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">
                <tr><td style="padding:22px 28px;background:linear-gradient(100deg,#0f1d38,#1b335d 45%%,#2c59a5);background-color:#2c59a5;color:#ffffff;border-bottom:5px solid #ffda00">
                <div style="font-size:24px;font-weight:800">ALuNI</div>
                <div style="font-size:12px;opacity:.9">Académie Lumière du Numérique et de l'Innovation · CDEJ TG0157</div></td></tr>
                <tr><td style="padding:28px">
                <h1 style="margin:0 0 14px;font-size:20px">%s</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#3b4252">%s</p>%s
                <p style="margin:18px 0 0;font-size:13px;color:#6b7280">Message automatique de la plateforme ALuNI, merci de ne pas y répondre.</p>
                </td></tr>
                <tr><td style="padding:16px 28px;background:#f7f8f7;font-size:12px;color:#8a918d">ALuNI – Académie Lumière du Numérique, Kpévé (Togo)</td></tr>
                </table></td></tr></table></body></html>""".formatted(HtmlUtils.htmlEscape(title), body, box);
    }

    /** L'envoi d'un message a échoué ou le canal n'est pas configuré. */
    public static class DeliveryException extends RuntimeException {
        public DeliveryException(String message) {
            super(message);
        }

        public DeliveryException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
