package tg.cdej.aluni.service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;

import tg.cdej.aluni.dto.LearningDtos.CertificateDto;

/** Génère le certificat au format PDF (A4 paysage) avec logo, signature numérique et QR code de vérification. */
@Service
public class CertificatePdfService {

    private record Palette(Color border, Color accent, Color background) {
    }

    private static final Map<String, Palette> TEMPLATES = Map.of(
            "classique", new Palette(new Color(0xB5A36A), new Color(0x16592B), new Color(0xFFFDF7)),
            "vert", new Palette(new Color(0x1A6F33), new Color(0x1A6F33), Color.WHITE),
            "flamme", new Palette(new Color(0xF26A1B), new Color(0xB4400E), new Color(0xFFFAF6)));

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.FRENCH);

    private final SettingsService settings;

    public CertificatePdfService(SettingsService settings) {
        this.settings = settings;
    }

    public byte[] render(CertificateDto c) {
        Palette p = TEMPLATES.getOrDefault(c.template(), TEMPLATES.get("classique"));
        Rectangle page = PageSize.A4.rotate();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(page, 0, 0, 0, 0);
        try {
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            doc.addTitle("Certificat " + c.code());
            doc.addAuthor(settings.get("academy.name"));
            doc.open();
            PdfContentByte cb = writer.getDirectContent();
            float w = page.getWidth();
            float h = page.getHeight();

            // Fond et double cadre
            cb.setColorFill(p.background());
            cb.rectangle(0, 0, w, h);
            cb.fill();
            cb.setColorStroke(p.border());
            cb.setLineWidth(6f);
            cb.rectangle(18, 18, w - 36, h - 36);
            cb.stroke();
            cb.setLineWidth(1.2f);
            cb.rectangle(30, 30, w - 60, h - 60);
            cb.stroke();

            BaseFont regular = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont bold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont serif = BaseFont.createFont(BaseFont.TIMES_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont script = BaseFont.createFont(BaseFont.TIMES_BOLDITALIC, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);

            // Logo du CDEJ
            try (InputStream logo = new ClassPathResource("static/logo-cdej.jpg").getInputStream()) {
                Image img = Image.getInstance(logo.readAllBytes());
                img.scaleToFit(80, 80);
                img.setAbsolutePosition(60, h - 135);
                cb.addImage(img);
            }

            // En-tête de l'Académie (à droite)
            text(cb, bold, 26, p.accent(), w - 60, h - 85, settings.get("academy.short"), Element.ALIGN_RIGHT);
            text(cb, regular, 9, Color.DARK_GRAY, w - 60, h - 102, settings.get("academy.name"), Element.ALIGN_RIGHT);
            text(cb, regular, 9, Color.GRAY, w - 60, h - 115,
                    settings.get("academy.center") + " · " + settings.get("academy.code"), Element.ALIGN_RIGHT);

            float cx = w / 2;
            boolean competence = "competence".equals(c.type());
            text(cb, bold, 26, p.accent(), cx, h - 175, competence ? "CERTIFICAT DE COMPÉTENCE" : "ATTESTATION DE SUIVI",
                    Element.ALIGN_CENTER);
            cb.setColorStroke(p.border());
            cb.setLineWidth(2f);
            cb.moveTo(cx - 50, h - 190);
            cb.lineTo(cx + 50, h - 190);
            cb.stroke();

            text(cb, regular, 13, Color.DARK_GRAY, cx, h - 220,
                    "L'" + settings.get("academy.name") + " certifie que", Element.ALIGN_CENTER);
            text(cb, serif, 34, new Color(0x1B1F1D), cx, h - 265, c.name(), Element.ALIGN_CENTER);
            text(cb, regular, 13, Color.DARK_GRAY, cx, h - 295,
                    competence ? "a réussi l'examen final de la formation" : "a suivi avec assiduité et terminé la formation",
                    Element.ALIGN_CENTER);
            text(cb, bold, 19, p.accent(), cx, h - 325, "« " + c.course().title() + " »", Element.ALIGN_CENTER);
            float y = h - 352;
            if (competence && c.score() != null) {
                text(cb, regular, 13, Color.DARK_GRAY, cx, y,
                        "avec la note de " + c.score() + "/100 – mention " + c.mention(), Element.ALIGN_CENTER);
                y -= 22;
            }
            text(cb, regular, 11, Color.GRAY, cx, y,
                    "Durée : " + c.hours() + " heures · Délivré à Kpévé, le " + DATE.format(c.date()), Element.ALIGN_CENTER);

            // Numéro (gauche)
            text(cb, regular, 9, Color.GRAY, 70, 95, "N° du certificat", Element.ALIGN_LEFT);
            text(cb, bold, 13, new Color(0x1B1F1D), 70, 78, c.code(), Element.ALIGN_LEFT);
            text(cb, regular, 9, Color.GRAY, 70, 62, competence ? "Certificat de compétence" : "Attestation de suivi",
                    Element.ALIGN_LEFT);

            // Signature (centre)
            text(cb, script, 22, p.accent(), cx, 100, c.signatory(), Element.ALIGN_CENTER);
            cb.setColorStroke(Color.GRAY);
            cb.setLineWidth(0.6f);
            cb.moveTo(cx - 90, 92);
            cb.lineTo(cx + 90, 92);
            cb.stroke();
            text(cb, bold, 10, Color.DARK_GRAY, cx, 78, c.signatoryTitle(), Element.ALIGN_CENTER);
            text(cb, regular, 8, Color.GRAY, cx, 64, "Signature numérique : " + c.signature(), Element.ALIGN_CENTER);

            // QR code de vérification (droite)
            Image qr = Image.getInstance(qrPng(c.verifyUrl()));
            qr.scaleAbsolute(84, 84);
            qr.setAbsolutePosition(w - 150, 62);
            cb.addImage(qr);
            text(cb, regular, 8, Color.GRAY, w - 108, 52, "Vérifier l'authenticité", Element.ALIGN_CENTER);

            if ("revoque".equals(c.status())) {
                cb.saveState();
                cb.setColorFill(new Color(220, 38, 38));
                cb.beginText();
                cb.setFontAndSize(bold, 90);
                cb.showTextAligned(Element.ALIGN_CENTER, "RÉVOQUÉ", cx, h / 2 - 30, 18);
                cb.endText();
                cb.restoreState();
            }
            doc.close();
        } catch (Exception e) {
            throw new IllegalStateException("Génération du PDF impossible", e);
        }
        return out.toByteArray();
    }

    private static void text(PdfContentByte cb, BaseFont font, float size, Color color, float x, float y, String value,
            int align) {
        cb.beginText();
        cb.setFontAndSize(font, size);
        cb.setColorFill(color);
        cb.showTextAligned(align, value == null ? "" : value, x, y, 0);
        cb.endText();
    }

    private static byte[] qrPng(String url) throws Exception {
        BitMatrix matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 300, 300,
                Map.of(EncodeHintType.MARGIN, 1));
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", png);
        return png.toByteArray();
    }
}
