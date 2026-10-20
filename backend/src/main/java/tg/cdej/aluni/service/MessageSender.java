package tg.cdej.aluni.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Envoi des messages (codes de récupération, identifiants).
 * L'e-mail part par SMTP si spring.mail.host est configuré. L'envoi de SMS dépend d'un fournisseur
 * (à brancher ici) : en attendant, le message est écrit dans le journal du serveur.
 */
@Service
public class MessageSender {

    private static final Logger log = LoggerFactory.getLogger(MessageSender.class);

    private final ObjectProvider<JavaMailSender> mailSender;

    public MessageSender(ObjectProvider<JavaMailSender> mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendSms(String phone, String text) {
        log.info("[SMS → +228 {}] {}", phone, text);
    }

    @Async
    public void sendEmail(String to, String subject, String text) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.info("[E-mail → {}] {} : {}", to, subject, text);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            sender.send(message);
        } catch (Exception e) {
            log.warn("Échec de l'envoi de l'e-mail à {} : {}", to, e.getMessage());
        }
    }
}
