package tg.cdej.aluni.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Envoi des SMS (Twilio) et des e-mails (SMTP). Chaque canal s'active dès que ses paramètres sont renseignés
 * (variables d'environnement ou fichier .env, voir .env.example).
 *
 * @param logOnly développement uniquement : les canaux non configurés sont simulés et le message est écrit dans le
 *                journal du serveur au lieu d'être envoyé
 */
@ConfigurationProperties(prefix = "aluni.messaging")
public record MessagingProperties(Mail mail, Twilio twilio, boolean logOnly) {

    public MessagingProperties {
        if (mail == null) mail = new Mail(null, 587, null, null, null, null);
        if (twilio == null) twilio = new Twilio(null, null, null);
    }

    /** Serveur SMTP (ex. Gmail : smtp.gmail.com, port 587, mot de passe d'application). */
    public record Mail(String host, int port, String username, String password, String from, String fromName) {
        public boolean configured() {
            return notBlank(host) && notBlank(from);
        }
    }

    /** Compte Twilio : identifiant du compte, jeton, et numéro d'envoi (+1…) ou service de messagerie (MG…). */
    public record Twilio(String accountSid, String authToken, String from) {
        public boolean configured() {
            return notBlank(accountSid) && notBlank(authToken) && notBlank(from);
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
