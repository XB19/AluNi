package tg.cdej.aluni.service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Predicate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import tg.cdej.aluni.common.Codes;
import tg.cdej.aluni.domain.AttemptStatus;
import tg.cdej.aluni.domain.Certificate;
import tg.cdej.aluni.domain.CertificateStatus;
import tg.cdej.aluni.domain.Enrollment;
import tg.cdej.aluni.domain.ExamAttempt;
import tg.cdej.aluni.domain.ProfileType;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.AdminDtos.LabelValue;
import tg.cdej.aluni.dto.AdminDtos.ProfileRow;
import tg.cdej.aluni.dto.AdminDtos.Report;
import tg.cdej.aluni.repository.CertificateRepository;
import tg.cdej.aluni.repository.EnrollmentRepository;
import tg.cdej.aluni.repository.ExamAttemptRepository;

/** Statistiques filtrables (période, formation, type d'apprenant) et exports Excel / PDF. */
@Service
public class ReportService {

    public static final Map<String, String> STAT_LABELS = Map.of(
            "signups", "Inscriptions aux formations",
            "completed", "Formations terminées",
            "successRate", "Taux de réussite (%)",
            "certificates", "Certificats délivrés");

    private static final Map<ProfileType, String> PROFILE_LABELS = Map.of(
            ProfileType.INTERNE, "CDEJ interne",
            ProfileType.AUTRE_CDEJ, "Autres CDEJ",
            ProfileType.PARTICULIER, "Particuliers");

    private final EnrollmentRepository enrollments;
    private final ExamAttemptRepository attempts;
    private final CertificateRepository certificates;
    private final ExcelService excel;

    public ReportService(EnrollmentRepository enrollments, ExamAttemptRepository attempts,
            CertificateRepository certificates, ExcelService excel) {
        this.enrollments = enrollments;
        this.attempts = attempts;
        this.certificates = certificates;
        this.excel = excel;
    }

    public record Filters(LocalDate from, LocalDate to, String course, String profile) {

        Instant start() {
            return from == null ? Instant.EPOCH : from.atStartOfDay().toInstant(ZoneOffset.UTC);
        }

        Instant end() {
            return to == null ? Instant.now().plusSeconds(86400) : to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        }

        boolean inRange(Instant t) {
            return t != null && !t.isBefore(start()) && t.isBefore(end());
        }

        boolean matches(User u, String courseSlug) {
            ProfileType p = Codes.parse(ProfileType.class, profile);
            return (course == null || course.isBlank() || course.equals(courseSlug)) && (p == null || u.getProfileType() == p);
        }

        String label() {
            DateTimeFormatter f = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            if (from == null && to == null) return "toutes périodes";
            return (from == null ? "début" : f.format(from)) + " au " + (to == null ? "aujourd'hui" : f.format(to));
        }
    }

    @Transactional(readOnly = true)
    public Report report(Filters f) {
        List<Enrollment> ens = enrollments.findAll().stream()
                .filter(e -> f.matches(e.getUser(), e.getCourse().getSlug())).toList();
        List<ExamAttempt> done = attempts.findByStatus(AttemptStatus.SOUMIS).stream()
                .filter(a -> f.matches(a.getUser(), a.getExam().getCourse().getSlug()) && f.inRange(a.getSubmittedAt())).toList();
        Predicate<Certificate> certOk = c -> c.getStatus() != CertificateStatus.EN_ATTENTE
                && f.matches(c.getUser(), c.getCourse().getSlug())
                && f.inRange(c.getIssuedAt().atStartOfDay().toInstant(ZoneOffset.UTC));
        List<Certificate> certs = certificates.findAll().stream().filter(certOk).toList();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("signups", ens.stream().filter(e -> f.inRange(e.getEnrolledAt())).count());
        stats.put("completed", ens.stream().filter(e -> f.inRange(e.getCompletedAt())).count());
        stats.put("successRate", AdminService.successRate(done));
        stats.put("certificates", certs.size());

        // Inscriptions par mois sur l'année de fin de période
        int year = f.to() == null ? LocalDate.now().getYear() : f.to().getYear();
        long[] perMonth = new long[12];
        ens.forEach(e -> {
            LocalDate d = LocalDate.ofInstant(e.getEnrolledAt(), ZoneOffset.UTC);
            if (d.getYear() == year && f.inRange(e.getEnrolledAt())) perMonth[d.getMonthValue() - 1]++;
        });
        int lastMonth = year == LocalDate.now().getYear() ? LocalDate.now().getMonthValue() : 12;
        List<LabelValue> monthly = new ArrayList<>();
        for (int m = 1; m <= lastMonth; m++) monthly.add(new LabelValue(AdminService.monthLabel(m), perMonth[m - 1]));

        // Taux de réussite par formation
        Map<String, List<ExamAttempt>> byCourse = new LinkedHashMap<>();
        done.forEach(a -> byCourse.computeIfAbsent(a.getExam().getCourse().getTitle(), k -> new ArrayList<>()).add(a));
        List<LabelValue> success = byCourse.entrySet().stream()
                .map(e -> new LabelValue(e.getKey(), AdminService.successRate(e.getValue())))
                .sorted(Comparator.comparingLong(LabelValue::value).reversed()).toList();

        List<ProfileRow> byProfile = new ArrayList<>();
        for (ProfileType p : ProfileType.values()) {
            List<Enrollment> pe = ens.stream().filter(e -> e.getUser().getProfileType() == p).toList();
            List<ExamAttempt> pa = done.stream().filter(a -> a.getUser().getProfileType() == p).toList();
            Integer rate = AdminService.successRate(pa);
            byProfile.add(new ProfileRow(Codes.of(p), PROFILE_LABELS.get(p),
                    pe.stream().filter(e -> f.inRange(e.getEnrolledAt())).map(e -> e.getUser().getId()).distinct().count(),
                    pe.stream().filter(e -> f.inRange(e.getCompletedAt())).count(), rate == null ? 0 : rate,
                    certs.stream().filter(c -> c.getUser().getProfileType() == p).count()));
        }
        return new Report(stats, monthly, success, byProfile);
    }

    @Transactional(readOnly = true)
    public byte[] excel(Filters f) {
        return excel.report(report(f), f.label());
    }

    @Transactional(readOnly = true)
    public byte[] pdf(Filters f) {
        Report r = report(f);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();
            Color green = new Color(0x16592B);
            Font title = new Font(Font.HELVETICA, 18, Font.BOLD, green);
            Font h2 = new Font(Font.HELVETICA, 13, Font.BOLD, green);
            Font normal = new Font(Font.HELVETICA, 10);
            Font bold = new Font(Font.HELVETICA, 10, Font.BOLD);
            doc.add(new Paragraph("Rapport d'activité – ALuNI", title));
            doc.add(new Paragraph("Période : " + f.label() + " · généré le "
                    + DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.FRENCH).format(LocalDate.now()), normal));
            doc.add(new Paragraph(" "));

            doc.add(new Paragraph("Chiffres clés", h2));
            PdfPTable stats = table(2, new float[] { 3, 1 });
            r.stats().forEach((k, v) -> {
                stats.addCell(cell(STAT_LABELS.getOrDefault(k, k), normal));
                stats.addCell(cell(v == null ? "—" : String.valueOf(v), bold));
            });
            doc.add(stats);

            doc.add(new Paragraph("Synthèse par type d'apprenant", h2));
            PdfPTable profiles = table(5, new float[] { 3, 2, 2, 2, 2 });
            for (String h : new String[] { "Profil", "Inscrits", "Terminées", "Réussite (%)", "Certificats" }) profiles.addCell(cell(h, bold));
            r.byProfile().forEach(p -> {
                profiles.addCell(cell(p.label(), normal));
                profiles.addCell(cell(String.valueOf(p.learners()), normal));
                profiles.addCell(cell(String.valueOf(p.completed()), normal));
                profiles.addCell(cell(String.valueOf(p.successRate()), normal));
                profiles.addCell(cell(String.valueOf(p.certificates()), normal));
            });
            doc.add(profiles);

            doc.add(new Paragraph("Taux de réussite par formation", h2));
            PdfPTable success = table(2, new float[] { 4, 1 });
            if (r.successByCourse().isEmpty()) success.addCell(cell("Aucun examen sur la période", normal));
            r.successByCourse().forEach(s -> {
                success.addCell(cell(s.label(), normal));
                success.addCell(cell(s.value() + " %", bold));
            });
            if (r.successByCourse().isEmpty()) success.addCell(cell("", normal));
            doc.add(success);

            doc.add(new Paragraph("Inscriptions par mois", h2));
            PdfPTable monthly = table(2, new float[] { 3, 1 });
            r.monthly().forEach(m -> {
                monthly.addCell(cell(m.label(), normal));
                monthly.addCell(cell(String.valueOf(m.value()), normal));
            });
            doc.add(monthly);
            doc.close();
        } catch (Exception e) {
            throw new IllegalStateException("Génération du rapport impossible", e);
        }
        return out.toByteArray();
    }

    private static PdfPTable table(int columns, float[] widths) throws Exception {
        PdfPTable t = new PdfPTable(columns);
        t.setWidthPercentage(100);
        t.setWidths(widths);
        t.setSpacingBefore(6);
        t.setSpacingAfter(16);
        return t;
    }

    private static PdfPCell cell(String text, Font font) {
        PdfPCell c = new PdfPCell(new Phrase(text, font));
        c.setPadding(5);
        c.setBorderColor(new Color(0xE5E7EB));
        c.setHorizontalAlignment(Element.ALIGN_LEFT);
        return c;
    }
}
