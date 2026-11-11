package tg.cdej.aluni.service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
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
import com.lowagie.text.pdf.PdfGState;
import com.lowagie.text.pdf.PdfShading;
import com.lowagie.text.pdf.PdfShadingPattern;
import com.lowagie.text.pdf.PdfWriter;

import tg.cdej.aluni.dto.LearningDtos.CertificateDto;

/**
 * Génère le certificat au format PDF (A4 paysage), avec la même mise en page que l'aperçu du site
 * (components/Certificate.jsx) : cadre vert foncé, bandeau en dégradé, sceau de certification, corps aligné à gauche,
 * signature numérique et QR code de vérification.
 */
@Service
public class CertificatePdfService {

    /** Couleurs du bandeau (4 étapes du dégradé), du texte du sceau et de son accent. */
    private record Palette(Color[] band, Color accent, Color seal) {
    }

    private static final Map<String, Palette> TEMPLATES = Map.of(
            "classique", new Palette(colors(0x07210F, 0x16592B, 0x258A41, 0xF26A1B), new Color(0x16592B), new Color(0xF26A1B)),
            "vert", new Palette(colors(0x07210F, 0x134725, 0x1A6F33, 0x45A660), new Color(0x16592B), new Color(0x258A41)),
            "flamme", new Palette(colors(0x0F3A1F, 0xB4400E, 0xF26A1B, 0xFB8A3C), new Color(0xB4400E), new Color(0xF26A1B)));

    private static final Color FRAME_LIGHT = new Color(0x134725);
    private static final Color FRAME_DARK = new Color(0x07210F);
    private static final Color PAPER = new Color(0xF7F8F7);
    private static final Color INK = new Color(0x1B1F1D);
    private static final Color MUTED = new Color(0x5B625E);
    private static final Color DOTTED = new Color(0xC5CBC7);
    private static final Color FAINT = new Color(0x8A918D);

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
            float u = w / 100f; // 1 % de la largeur, l'équivalent du « cqw » de l'aperçu

            BaseFont regular = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont bold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            BaseFont script = BaseFont.createFont(BaseFont.TIMES_BOLDITALIC, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            byte[] logoBytes;
            try (InputStream logo = new ClassPathResource("static/logo-cdej.jpg").getInputStream()) {
                logoBytes = logo.readAllBytes();
            }

            // ---- Cadre vert foncé et feuille claire
            fillGradient(writer, cb, 0, 0, w, h, new Color[] { FRAME_LIGHT, FRAME_DARK }, true);
            float m = 2.2f * u;
            float x0 = m, y0 = m, iw = w - 2 * m, ih = h - 2 * m;
            cb.setColorFill(PAPER);
            cb.rectangle(x0, y0, iw, ih);
            cb.fill();

            // ---- Bandeau en dégradé avec trame de points
            float bandH = ih * 0.27f;
            float bandY = y0 + ih - bandH;
            fillGradient(writer, cb, x0, bandY, iw, bandH, p.band(), false);
            cb.saveState();
            PdfGState dots = new PdfGState();
            dots.setFillOpacity(0.22f);
            cb.setGState(dots);
            cb.setColorFill(Color.WHITE);
            float step = 1.3f * u;
            for (float x = x0 + step / 2; x < x0 + iw; x += step) {
                for (float y = bandY + step / 2; y < bandY + bandH; y += step) {
                    cb.circle(x, y, 0.55f);
                }
            }
            cb.fill();
            cb.restoreState();

            // ---- En-tête du bandeau : logo, ALuNI, nom de l'Académie × CDEJ
            float left = x0 + iw * 0.13f;
            float midBand = bandY + bandH / 2;
            float logoR = 3.1f * u;
            cb.setColorFill(Color.WHITE);
            cb.circle(left + logoR, midBand, logoR);
            cb.fill();
            Image logo = Image.getInstance(logoBytes);
            logo.scaleToFit(logoR * 1.75f, logoR * 1.75f);
            logo.setAbsolutePosition(left + logoR - logo.getScaledWidth() / 2, midBand - logo.getScaledHeight() / 2);
            cb.saveState();
            cb.circle(left + logoR, midBand, logoR * 0.9f);
            cb.clip();
            cb.newPath();
            cb.addImage(logo);
            cb.restoreState();

            float tx = left + 2 * logoR + 1.2f * u;
            float brand = 3f * u;
            float bx = tx;
            bx += text(cb, bold, brand, Color.WHITE, bx, midBand + 0.2f * u, "ALu", Element.ALIGN_LEFT);
            bx += text(cb, bold, brand, new Color(0xFFB27A), bx, midBand + 0.2f * u, "N", Element.ALIGN_LEFT);
            text(cb, bold, brand, Color.WHITE, bx, midBand + 0.2f * u, "I", Element.ALIGN_LEFT);
            String academyName = settings.get("academy.name");
            text(cb, regular, 1.15f * u, Color.WHITE, tx, midBand - 1.6f * u, academyName, Element.ALIGN_LEFT);
            float afterName = tx + Math.max(regular.getWidthPoint(academyName, 1.15f * u), bold.getWidthPoint("ALuNI", brand));
            float sx = afterName + 2f * u;
            sx += text(cb, regular, 1.6f * u, new Color(0xDDE7DF), sx, midBand - 0.5f * u, "×", Element.ALIGN_LEFT);
            text(cb, bold, 2.8f * u, Color.WHITE, sx + 2f * u, midBand - 0.9f * u, "CDEJ " + settings.get("academy.code"),
                    Element.ALIGN_LEFT);

            // ---- Sceau de certification, à cheval sur le bandeau
            float sealR = 8.5f * u;
            float sealCx = x0 + iw * 0.91f - sealR;
            float sealCy = bandY;
            seal(cb, p, bold, logoBytes, sealCx, sealCy, sealR);

            // ---- Corps aligné à gauche
            boolean competence = "competence".equals(c.type());
            float y = bandY - 4.6f * u - 2.8f * u;
            text(cb, bold, 3.5f * u, INK, left, y, c.name(), Element.ALIGN_LEFT);
            y -= 1.2f * u;
            dashed(cb, left, y, 36 * u);
            y -= 1.3f * u;
            text(cb, regular, 0.95f * u, MUTED, left, y, "Titulaire", Element.ALIGN_LEFT);

            y -= 3.6f * u;
            text(cb, regular, 1.1f * u, MUTED, left, y,
                    competence ? "a obtenu le Certificat de compétence en" : "a obtenu l'Attestation de suivi de la formation",
                    Element.ALIGN_LEFT);
            float titleSize = (c.course().title().length() > 42 ? 2.5f : 3f) * u;
            for (String line : wrap(bold, titleSize, c.course().title(), 62 * u)) {
                y -= titleSize * 1.15f;
                text(cb, bold, titleSize, INK, left, y, line, Element.ALIGN_LEFT);
            }

            // Ligne de champs : date et numéro
            y -= 4.2f * u;
            String[][] fields = {
                    { "Date", DATE.format(c.date()) },
                    { "N° du certificat", c.code() } };
            float[] widths = { 15 * u, 16 * u };
            float fx = left;
            for (int i = 0; i < fields.length; i++) {
                text(cb, bold, 1.35f * u, INK, fx, y, fields[i][1], Element.ALIGN_LEFT);
                dashed(cb, fx, y - 1f * u, widths[i]);
                text(cb, regular, 0.95f * u, MUTED, fx, y - 2.3f * u, fields[i][0], Element.ALIGN_LEFT);
                fx += widths[i] + 2.6f * u;
            }

            // Signature (en bas à gauche)
            float base = y0 + 3f * u;
            text(cb, regular, 0.8f * u, FAINT, left, base, "Signature numérique : " + c.signature(), Element.ALIGN_LEFT);
            text(cb, regular, 1f * u, MUTED, left, base + 1.3f * u, c.signatoryTitle(), Element.ALIGN_LEFT);
            text(cb, bold, 1.1f * u, INK, left, base + 2.6f * u, c.signatory(), Element.ALIGN_LEFT);
            dashed(cb, left, base + 3.9f * u, 30 * u);
            text(cb, script, 3.1f * u, INK, left, base + 4.6f * u, c.signatory(), Element.ALIGN_LEFT);

            // QR code de vérification (en bas à droite)
            float qrSize = 7.5f * u;
            float qrX = x0 + iw * 0.94f - qrSize;
            Image qr = Image.getInstance(qrPng(c.verifyUrl()));
            qr.scaleAbsolute(qrSize, qrSize);
            cb.setColorFill(Color.WHITE);
            cb.setColorStroke(new Color(0xE3E7E4));
            cb.setLineWidth(0.6f);
            cb.rectangle(qrX - 0.5f * u, base - 0.5f * u, qrSize + u, qrSize + u);
            cb.fillStroke();
            qr.setAbsolutePosition(qrX, base);
            cb.addImage(qr);
            float qtx = qrX - 1.7f * u;
            float qty = base + qrSize / 2 + 1.2f * u;
            text(cb, bold, 0.9f * u, INK, qtx, qty, "Vérifier l'authenticité", Element.ALIGN_RIGHT);
            text(cb, regular, 0.9f * u, MUTED, qtx, qty - 1.2f * u, "Scannez le code ou rendez-vous", Element.ALIGN_RIGHT);
            text(cb, regular, 0.9f * u, MUTED, qtx, qty - 2.4f * u, "sur la page « Vérifier un certificat »", Element.ALIGN_RIGHT);

            if ("revoque".equals(c.status())) {
                cb.saveState();
                PdfGState faded = new PdfGState();
                faded.setFillOpacity(0.25f);
                cb.setGState(faded);
                cb.setColorFill(new Color(220, 38, 38));
                cb.beginText();
                cb.setFontAndSize(bold, 14 * u);
                cb.showTextAligned(Element.ALIGN_CENTER, "RÉVOQUÉ", w / 2, h / 2 - 5 * u, 18);
                cb.endText();
                cb.restoreState();
            }
            doc.close();
        } catch (Exception e) {
            throw new IllegalStateException("Génération du PDF impossible", e);
        }
        return out.toByteArray();
    }

    /** Sceau rond : « ACADÉMIE LUMIÈRE DU NUMÉRIQUE » en haut, « CERTIFICATION » en bas, logo au centre. */
    private static void seal(PdfContentByte cb, Palette p, BaseFont bold, byte[] logoBytes, float cx, float cy, float r)
            throws Exception {
        float s = r / 100f; // même géométrie que le SVG de l'aperçu (viewBox 200)
        cb.setColorFill(Color.WHITE);
        cb.circle(cx, cy, 97 * s);
        cb.fill();
        cb.setColorStroke(p.accent());
        cb.setLineWidth(3 * s);
        cb.circle(cx, cy, 89 * s);
        cb.stroke();
        cb.setLineWidth(1.6f * s);
        cb.circle(cx, cy, 55 * s);
        cb.stroke();

        arcText(cb, bold, 11.5f * s, 1.2f * s, p.accent(), cx, cy, 66 * s, "ACADÉMIE LUMIÈRE DU NUMÉRIQUE", true);
        arcText(cb, bold, 13f * s, 2.5f * s, p.seal(), cx, cy, 80 * s, "CERTIFICATION", false);
        cb.setColorFill(p.seal());
        for (int side : new int[] { -1, 1 }) {
            double a = Math.toRadians(side < 0 ? 208 : 332);
            cb.circle(cx + (float) (75 * s * Math.cos(a)), cy + (float) (75 * s * Math.sin(a)), 2.6f * s);
        }
        cb.fill();

        cb.saveState();
        cb.circle(cx, cy, 40 * s);
        cb.clip();
        cb.newPath();
        Image logo = Image.getInstance(logoBytes);
        logo.scaleAbsolute(80 * s, 80 * s);
        logo.setAbsolutePosition(cx - 40 * s, cy - 40 * s);
        cb.addImage(logo);
        cb.restoreState();
    }

    /**
     * Texte sur un cercle. En haut (top = true), lu de gauche à droite dans le sens horaire, les lettres pointent vers
     * l'extérieur ; en bas, lu de gauche à droite dans le sens antihoraire, les lettres pointent vers le centre.
     */
    private static void arcText(PdfContentByte cb, BaseFont font, float size, float spacing, Color color, float cx, float cy,
            float r, String value, boolean top) {
        float total = 0;
        for (char ch : value.toCharArray()) {
            total += font.getWidthPoint(String.valueOf(ch), size) + spacing;
        }
        total -= spacing;
        double angle = top ? Math.PI / 2 + total / 2 / r : 3 * Math.PI / 2 - total / 2 / r;
        cb.setColorFill(color);
        for (char ch : value.toCharArray()) {
            float cw = font.getWidthPoint(String.valueOf(ch), size);
            double mid = top ? angle - cw / 2 / r : angle + cw / 2 / r;
            float x = cx + (float) (r * Math.cos(mid));
            float y = cy + (float) (r * Math.sin(mid));
            float rot = (float) Math.toDegrees(top ? mid - Math.PI / 2 : mid + Math.PI / 2);
            cb.beginText();
            cb.setFontAndSize(font, size);
            cb.showTextAligned(Element.ALIGN_CENTER, String.valueOf(ch), x, y, rot);
            cb.endText();
            angle = top ? angle - (cw + spacing) / r : angle + (cw + spacing) / r;
        }
    }

    /**
     * Remplit un rectangle d'un dégradé linéaire : diagonal à deux couleurs (cadre), ou horizontal à plusieurs étapes
     * (bandeau), dessiné en fines bandes verticales pour un rendu identique dans tous les lecteurs PDF.
     */
    private static void fillGradient(PdfWriter writer, PdfContentByte cb, float x, float y, float w, float h, Color[] stops,
            boolean diagonal) {
        if (diagonal) {
            PdfShading shading = PdfShading.simpleAxial(writer, x, y + h, x + w, y, stops[0], stops[stops.length - 1]);
            cb.saveState();
            cb.setShadingFill(new PdfShadingPattern(shading));
            cb.rectangle(x, y, w, h);
            cb.fill();
            cb.restoreState();
            return;
        }
        int strips = 240;
        float sw = w / strips;
        int n = stops.length - 1;
        for (int i = 0; i < strips; i++) {
            float t = (i + 0.5f) / strips * n;
            int k = Math.min((int) t, n - 1);
            float f = t - k;
            Color a = stops[k], b = stops[k + 1];
            cb.setColorFill(new Color(
                    Math.round(a.getRed() + (b.getRed() - a.getRed()) * f),
                    Math.round(a.getGreen() + (b.getGreen() - a.getGreen()) * f),
                    Math.round(a.getBlue() + (b.getBlue() - a.getBlue()) * f)));
            cb.rectangle(x + i * sw, y, sw + 0.4f, h); // léger chevauchement : pas de liseré entre les bandes
            cb.fill();
        }
    }

    private static void dashed(PdfContentByte cb, float x, float y, float width) {
        cb.saveState();
        cb.setColorStroke(DOTTED);
        cb.setLineWidth(0.8f);
        cb.setLineDash(3f, 2f, 0);
        cb.moveTo(x, y);
        cb.lineTo(x + width, y);
        cb.stroke();
        cb.restoreState();
    }

    /** Écrit un texte et renvoie sa largeur. */
    private static float text(PdfContentByte cb, BaseFont font, float size, Color color, float x, float y, String value,
            int align) {
        String v = value == null ? "" : value;
        cb.beginText();
        cb.setFontAndSize(font, size);
        cb.setColorFill(color);
        cb.showTextAligned(align, v, x, y, 0);
        cb.endText();
        return font.getWidthPoint(v, size);
    }

    /** Coupe un texte en lignes qui tiennent dans la largeur donnée. */
    private static List<String> wrap(BaseFont font, float size, String value, float maxWidth) {
        List<String> lines = new ArrayList<>();
        StringBuilder line = new StringBuilder();
        for (String word : value.split("\\s+")) {
            String next = line.isEmpty() ? word : line + " " + word;
            if (font.getWidthPoint(next, size) > maxWidth && !line.isEmpty()) {
                lines.add(line.toString());
                line = new StringBuilder(word);
            } else {
                line = new StringBuilder(next);
            }
        }
        if (!line.isEmpty()) {
            lines.add(line.toString());
        }
        return lines;
    }

    private static Color[] colors(int... rgb) {
        Color[] out = new Color[rgb.length];
        for (int i = 0; i < rgb.length; i++) {
            out[i] = new Color(rgb[i]);
        }
        return out;
    }

    private static byte[] qrPng(String url) throws Exception {
        BitMatrix matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 300, 300,
                Map.of(EncodeHintType.MARGIN, 1));
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", png);
        return png.toByteArray();
    }
}
