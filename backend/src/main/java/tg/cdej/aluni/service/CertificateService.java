package tg.cdej.aluni.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.config.AppProperties;
import tg.cdej.aluni.domain.CertType;
import tg.cdej.aluni.domain.Certificate;
import tg.cdej.aluni.domain.CertificateStatus;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.NotificationType;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.LearningDtos.CertificateDto;
import tg.cdej.aluni.repository.CertificateRepository;

@Service
public class CertificateService {

    private final CertificateRepository certificates;
    private final NotificationService notifications;
    private final CertificatePdfService pdf;
    private final Mapper mapper;
    private final AppProperties props;

    public CertificateService(CertificateRepository certificates, NotificationService notifications,
            CertificatePdfService pdf, Mapper mapper, AppProperties props) {
        this.certificates = certificates;
        this.notifications = notifications;
        this.pdf = pdf;
        this.mapper = mapper;
        this.props = props;
    }

    public static String mention(Integer score) {
        if (score == null) return null;
        if (score >= 90) return "Excellent";
        if (score >= 80) return "Très bien";
        if (score >= 70) return "Bien";
        if (score >= 60) return "Assez bien";
        return "Passable";
    }

    /** Signature HMAC-SHA256 des données qui figurent sur le certificat : toute modification la rend invalide. */
    public String sign(Certificate c) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(props.certificateSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String data = String.join("|", c.getCode(), c.getHolderName(), c.getCourse().getSlug(), c.getType().name(),
                    String.valueOf(c.getScore()), c.getIssuedAt().toString());
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Signature impossible", e);
        }
    }

    public boolean signatureValid(Certificate c) {
        return sign(c).equals(c.getSignature());
    }

    /** Délivre (ou renvoie) le certificat d'un apprenant pour une formation. */
    @Transactional
    public Certificate issue(User user, Course course, CertType type, Integer score, boolean needsValidation) {
        return certificates.findByUserAndCourseAndType(user, course, type).orElseGet(() -> {
            Certificate c = new Certificate();
            c.setCode(String.format("ALUNI-%d-%06d", LocalDate.now().getYear(), certificates.nextCodeNumber()));
            c.setUser(user);
            c.setCourse(course);
            c.setType(type);
            c.setHolderName(user.getFirstName() + " " + user.getLastName().toUpperCase(Locale.FRENCH));
            c.setScore(score);
            c.setMention(mention(score));
            c.setIssuedAt(LocalDate.now());
            c.setStatus(needsValidation ? CertificateStatus.EN_ATTENTE : CertificateStatus.VALIDE);
            c.setSignature(sign(c));
            certificates.save(c);
            String label = type == CertType.COMPETENCE ? "certificat" : "attestation";
            if (needsValidation) {
                notifications.notify(user, NotificationType.CERTIFICATE, "Certificat en cours de validation",
                        "Votre " + label + " « " + course.getTitle() + " » sera disponible après validation par l'Académie.",
                        "/apprenant/certificats");
            } else {
                notifications.notify(user, NotificationType.CERTIFICATE, "Certificat disponible",
                        "Votre " + label + " « " + course.getTitle() + " » est prêt à être téléchargé.",
                        "/apprenant/certificats/" + c.getCode());
            }
            return c;
        });
    }

    private Certificate find(String code) {
        return certificates.findByCode(code.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> ApiException.notFound("Aucun certificat ne correspond à ce numéro."));
    }

    /** Vérification publique : un certificat en attente de validation n'est pas encore considéré comme délivré. */
    @Transactional(readOnly = true)
    public CertificateDto verify(String code) {
        Certificate c = find(code);
        if (c.getStatus() == CertificateStatus.EN_ATTENTE) throw ApiException.notFound("Aucun certificat ne correspond à ce numéro.");
        if (!signatureValid(c)) throw ApiException.notFound("Ce certificat n'est pas authentique.");
        return mapper.certificate(c);
    }

    @Transactional(readOnly = true)
    public List<CertificateDto> mine(User user) {
        return certificates.findByUserOrderByIssuedAtDesc(user).stream().map(mapper::certificate).toList();
    }

    private Certificate accessible(String code, User user) {
        Certificate c = find(code);
        if (user.getRole() != Role.ADMIN && !c.getUser().getId().equals(user.getId())) {
            throw ApiException.forbidden("Ce certificat ne vous appartient pas.");
        }
        return c;
    }

    @Transactional(readOnly = true)
    public CertificateDto get(String code, User user) {
        return mapper.certificate(accessible(code, user));
    }

    @Transactional(readOnly = true)
    public byte[] pdf(String code, User user) {
        Certificate c = accessible(code, user);
        if (c.getStatus() == CertificateStatus.EN_ATTENTE) throw ApiException.badRequest("Ce certificat attend encore la validation de l'Académie.");
        return pdf.render(mapper.certificate(c));
    }

    @Transactional(readOnly = true)
    public List<CertificateDto> all(String q) {
        String term = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        return certificates.findAllByOrderByIssuedAtDescIdDesc().stream()
                .filter(c -> term.isEmpty() || (c.getCode() + " " + c.getHolderName()).toLowerCase(Locale.ROOT).contains(term))
                .map(mapper::certificate).toList();
    }

    @Transactional
    public CertificateDto revoke(String code, String reason) {
        Certificate c = find(code);
        if (c.getStatus() == CertificateStatus.REVOQUE) throw ApiException.badRequest("Ce certificat est déjà révoqué.");
        c.setStatus(CertificateStatus.REVOQUE);
        c.setRevokedReason(reason.trim());
        c.setRevokedAt(Instant.now());
        notifications.notify(c.getUser(), NotificationType.CERTIFICATE, "Certificat révoqué",
                "Votre certificat « " + c.getCourse().getTitle() + " » a été révoqué par l'Académie.", "/apprenant/certificats");
        return mapper.certificate(c);
    }

    @Transactional
    public void decide(String code, boolean approve) {
        Certificate c = find(code);
        if (c.getStatus() != CertificateStatus.EN_ATTENTE) throw ApiException.badRequest("Ce certificat n'est pas en attente.");
        if (approve) {
            c.setStatus(CertificateStatus.VALIDE);
            notifications.notify(c.getUser(), NotificationType.CERTIFICATE, "Certificat disponible",
                    "Votre certificat « " + c.getCourse().getTitle() + " » a été validé et peut être téléchargé.",
                    "/apprenant/certificats/" + c.getCode());
        } else {
            c.setStatus(CertificateStatus.REVOQUE);
            c.setRevokedReason("Non validé par l'Académie");
            c.setRevokedAt(Instant.now());
        }
    }
}
