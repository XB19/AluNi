package tg.cdej.aluni.service.importer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.apache.poi.hslf.usermodel.HSLFSlide;
import org.apache.poi.hslf.usermodel.HSLFSlideShow;
import org.apache.poi.hslf.usermodel.HSLFTextParagraph;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.model.StyleDescription;
import org.apache.poi.hwpf.usermodel.Paragraph;
import org.apache.poi.hwpf.usermodel.Range;
import org.apache.poi.sl.usermodel.Placeholder;
import org.apache.poi.xslf.usermodel.SlideLayout;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFGroupShape;
import org.apache.poi.xslf.usermodel.XSLFNotes;
import org.apache.poi.xslf.usermodel.XSLFPictureShape;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTable;
import org.apache.poi.xslf.usermodel.XSLFTableCell;
import org.apache.poi.xslf.usermodel.XSLFTableRow;
import org.apache.poi.xslf.usermodel.XSLFTextParagraph;
import org.apache.poi.xslf.usermodel.XSLFTextRun;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFHyperlinkRun;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFPicture;
import org.apache.poi.xwpf.usermodel.XWPFPictureData;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFStyle;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Component;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.service.importer.DocBlock.Kind;

/**
 * Lit un document Word (.docx, .doc), PowerPoint (.pptx, .ppt), PDF ou texte et le ramène à une liste de
 * blocs (titres, paragraphes, listes, tableaux, images, diapositives).
 */
@Component
public class DocumentExtractor {

    /** Résultat de l'extraction. */
    public record Extracted(String format, String title, String subtitle, List<DocBlock> blocks) {

        public boolean slides() {
            return format.equals("pptx") || format.equals("ppt");
        }
    }

    /** Enregistre une image extraite et renvoie son URL (ou null pour l'ignorer). */
    public interface ImageSink {
        String save(byte[] data, String extension);
    }

    public static final List<String> SUPPORTED = List.of("docx", "doc", "pptx", "ppt", "pdf", "txt", "md");
    private static final int MAX_IMAGES = 150;
    private static final int MIN_IMAGE_BYTES = 2_000; // ignore puces graphiques et petites icônes

    private static final Pattern HEADING_STYLE = Pattern.compile("(?:heading|titre|title)\\s*([1-9])");

    public Extracted extract(String filename, InputStream in, ImageSink images) {
        String ext = extension(filename);
        if (!SUPPORTED.contains(ext)) {
            throw ApiException.badRequest("Format non pris en charge (." + ext + "). Formats acceptés : Word, PowerPoint, PDF ou texte.");
        }
        ImageSink sink = limited(images);
        try {
            return switch (ext) {
                case "docx" -> docx(in, sink);
                case "doc" -> doc(in);
                case "pptx" -> pptx(in, sink);
                case "ppt" -> ppt(in);
                case "pdf" -> pdf(in);
                default -> text(in);
            };
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("Impossible de lire ce document. Vérifiez qu'il n'est pas protégé par un mot de passe ou endommagé.");
        }
    }

    public static String extension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static ImageSink limited(ImageSink sink) {
        int[] count = { 0 };
        return (data, ext) -> {
            if (sink == null || data == null || data.length < MIN_IMAGE_BYTES || count[0] >= MAX_IMAGES) return null;
            String e = ext == null ? "" : ext.toLowerCase(Locale.ROOT).replace(".", "");
            if (!List.of("png", "jpg", "jpeg", "gif", "webp").contains(e)) return null; // formats affichables seulement
            count[0]++;
            return sink.save(data, e);
        };
    }

    /** Niveau de titre d'après le nom du style (« Heading 1 », « Titre 2 », « Title »…), 0 sinon, -1 pour un titre de document. */
    static int headingLevel(String styleName) {
        if (styleName == null) return 0;
        String s = styleName.toLowerCase(Locale.ROOT).replace(" ", "");
        if (s.equals("title") || s.equals("titre")) return -1;
        if (s.equals("subtitle") || s.equals("sous-titre") || s.equals("soustitre")) return -2;
        Matcher m = HEADING_STYLE.matcher(s);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    // ------------------------------------------------------------ Word .docx

    private Extracted docx(InputStream in, ImageSink images) throws IOException {
        List<DocBlock> blocks = new ArrayList<>();
        String title = null;
        String subtitle = null;
        try (XWPFDocument doc = new XWPFDocument(in)) {
            try {
                title = doc.getProperties().getCoreProperties().getTitle();
            } catch (Exception ignored) {
                // pas de propriétés
            }
            for (IBodyElement el : doc.getBodyElements()) {
                if (el instanceof XWPFParagraph p) {
                    int level = docxHeadingLevel(doc, p);
                    StringBuilder html = new StringBuilder();
                    int boldChars = 0;
                    int totalChars = 0;
                    List<String> pictures = new ArrayList<>();
                    for (XWPFRun r : p.getRuns()) {
                        String t = r.text();
                        if (t != null) {
                            int n = t.replaceAll("\\s", "").length();
                            totalChars += n;
                            if (r.isBold()) boldChars += n;
                        }
                        String part = Html.run(t, r.isBold(), r.isItalic());
                        if (r instanceof XWPFHyperlinkRun link && link.getHyperlink(doc) != null) {
                            part = Html.link(link.getHyperlink(doc).getURL(), part);
                        }
                        html.append(part);
                        for (XWPFPicture pic : r.getEmbeddedPictures()) {
                            XWPFPictureData data = pic.getPictureData();
                            if (data == null) continue;
                            String url = images.save(data.getData(), data.suggestFileExtension());
                            if (url != null) pictures.add(url);
                        }
                    }
                    String text = p.getText() == null ? "" : p.getText().strip();
                    boolean bold = totalChars > 0 && boldChars * 10 >= totalChars * 6;
                    if (!text.isEmpty()) {
                        if (level == -1) {
                            if (title == null || title.isBlank() || blocks.isEmpty()) title = text;
                        } else if (level == -2) {
                            subtitle = text;
                        } else if (level > 0) {
                            blocks.add(new DocBlock(Kind.HEADING, level, text, Html.escape(text), true));
                        } else if (p.getNumID() != null) {
                            blocks.add(new DocBlock(Kind.LIST_ITEM, listLevel(p), text, html.toString(), bold));
                        } else {
                            blocks.add(new DocBlock(Kind.PARAGRAPH, 0, text, html.toString(), bold));
                        }
                    }
                    pictures.forEach(url -> blocks.add(new DocBlock(Kind.IMAGE, 0, "", Html.image(url), false)));
                } else if (el instanceof XWPFTable t) {
                    List<List<String>> rows = new ArrayList<>();
                    StringBuilder text = new StringBuilder();
                    for (XWPFTableRow row : t.getRows()) {
                        List<String> cells = new ArrayList<>();
                        for (XWPFTableCell cell : row.getTableCells()) {
                            cells.add(cell.getText().strip());
                            text.append(cell.getText()).append(' ');
                        }
                        rows.add(cells);
                    }
                    if (!rows.isEmpty()) blocks.add(new DocBlock(Kind.TABLE, 0, text.toString().strip(), Html.table(rows), false));
                }
            }
        }
        return new Extracted("docx", title, subtitle, blocks);
    }

    /** Niveau d'une liste : retrait * 2, + 1 si la liste est numérotée (chiffres ou lettres). */
    static int listLevel(XWPFParagraph p) {
        int ilvl = p.getNumIlvl() == null ? 0 : p.getNumIlvl().intValue();
        boolean ordered = p.getNumFmt() != null && !"bullet".equals(p.getNumFmt()) && !"none".equals(p.getNumFmt());
        return ilvl * 2 + (ordered ? 1 : 0);
    }

    private static int docxHeadingLevel(XWPFDocument doc, XWPFParagraph p) {
        String styleId = p.getStyleID();
        if (styleId != null) {
            XWPFStyle style = doc.getStyles() == null ? null : doc.getStyles().getStyle(styleId);
            int level = headingLevel(style != null && style.getName() != null ? style.getName() : styleId);
            if (level != 0) return level;
            if (style != null) {
                int byId = headingLevel(styleId);
                if (byId != 0) return byId;
            }
        }
        try {
            if (p.getCTP().getPPr() != null && p.getCTP().getPPr().getOutlineLvl() != null) {
                BigInteger lvl = p.getCTP().getPPr().getOutlineLvl().getVal();
                if (lvl != null && lvl.intValue() < 9) return lvl.intValue() + 1;
            }
        } catch (Exception ignored) {
            // pas de niveau hiérarchique
        }
        return 0;
    }

    // ------------------------------------------------------------ Word 97-2003 .doc

    private Extracted doc(InputStream in) throws IOException {
        List<DocBlock> blocks = new ArrayList<>();
        String title = null;
        try (HWPFDocument doc = new HWPFDocument(in)) {
            Range range = doc.getRange();
            for (int i = 0; i < range.numParagraphs(); i++) {
                Paragraph p = range.getParagraph(i);
                String text = p.text().replaceAll("[\\r\\u0007\\f\\u000b]", " ").strip();
                if (text.isEmpty()) continue;
                StyleDescription style = doc.getStyleSheet().getStyleDescription(p.getStyleIndex());
                int level = headingLevel(style == null ? null : style.getName());
                boolean bold = p.numCharacterRuns() > 0 && p.getCharacterRun(0).isBold();
                if (level == -1) title = text;
                else if (level > 0) blocks.add(new DocBlock(Kind.HEADING, level, text, Html.escape(text), true));
                else if (p.isInList()) blocks.add(new DocBlock(Kind.LIST_ITEM, 0, text, Html.escape(text), bold));
                else blocks.add(new DocBlock(Kind.PARAGRAPH, 0, text, Html.run(text, bold, false), bold));
            }
        }
        return new Extracted("doc", title, null, blocks);
    }

    // ------------------------------------------------------------ PowerPoint .pptx

    private Extracted pptx(InputStream in, ImageSink images) throws IOException {
        List<DocBlock> blocks = new ArrayList<>();
        String title = null;
        String subtitle = null;
        try (XMLSlideShow ppt = new XMLSlideShow(in)) {
            int index = 0;
            for (XSLFSlide slide : ppt.getSlides()) {
                index++;
                SlideLayout layout = slide.getSlideLayout() == null ? null : slide.getSlideLayout().getType();
                String slideTitle = slideTitle(slide);
                int kind = layout == SlideLayout.SECTION_HEADER ? 1 : (layout == SlideLayout.TITLE && index == 1) ? 0 : 2;
                blocks.add(new DocBlock(Kind.SLIDE, kind, slideTitle, Html.escape(slideTitle), true));
                List<DocBlock> content = new ArrayList<>();
                shapes(slide.getShapes(), content, images);
                if (kind == 0) {
                    title = slideTitle;
                    subtitle = content.stream().map(DocBlock::text).filter(t -> !t.isBlank()).findFirst().orElse(null);
                    continue;
                }
                blocks.addAll(content);
                XSLFNotes notes = slide.getNotes();
                if (notes != null) {
                    for (XSLFShape shape : notes.getShapes()) {
                        if (shape instanceof XSLFTextShape ts && ts.getTextType() == Placeholder.BODY) {
                            String text = ts.getText() == null ? "" : ts.getText().strip();
                            if (!text.isEmpty()) {
                                for (String line : text.split("\\R+")) {
                                    if (!line.isBlank()) blocks.add(DocBlock.of(Kind.PARAGRAPH, line.strip()));
                                }
                            }
                        }
                    }
                }
            }
        }
        return new Extracted("pptx", title, subtitle, blocks);
    }

    /** Titre de la diapositive (titre normal ou titre centré des diapositives de titre). */
    private static String slideTitle(XSLFSlide slide) {
        for (XSLFShape shape : slide.getShapes()) {
            if (shape instanceof XSLFTextShape ts
                    && (ts.getTextType() == Placeholder.TITLE || ts.getTextType() == Placeholder.CENTERED_TITLE)) {
                String t = ts.getText();
                if (t != null && !t.isBlank()) return t.replaceAll("\\s+", " ").strip();
            }
        }
        return "";
    }

    private void shapes(List<XSLFShape> shapes, List<DocBlock> out, ImageSink images) {
        for (XSLFShape shape : shapes) {
            if (shape instanceof XSLFGroupShape group) {
                shapes(group.getShapes(), out, images);
            } else if (shape instanceof XSLFTable table) {
                List<List<String>> rows = new ArrayList<>();
                StringBuilder text = new StringBuilder();
                for (XSLFTableRow row : table.getRows()) {
                    List<String> cells = new ArrayList<>();
                    for (XSLFTableCell cell : row.getCells()) {
                        String t = cell.getText() == null ? "" : cell.getText().strip();
                        cells.add(t);
                        text.append(t).append(' ');
                    }
                    rows.add(cells);
                }
                if (!rows.isEmpty()) out.add(new DocBlock(Kind.TABLE, 0, text.toString().strip(), Html.table(rows), false));
            } else if (shape instanceof XSLFPictureShape pic) {
                if (pic.getPictureData() == null) continue;
                String url = images.save(pic.getPictureData().getData(), pic.getPictureData().suggestFileExtension());
                if (url != null) out.add(new DocBlock(Kind.IMAGE, 0, "", Html.image(url), false));
            } else if (shape instanceof XSLFTextShape ts) {
                Placeholder ph = ts.getTextType();
                if (ph == Placeholder.TITLE || ph == Placeholder.CENTERED_TITLE || ph == Placeholder.SLIDE_NUMBER
                        || ph == Placeholder.FOOTER || ph == Placeholder.DATETIME) continue;
                for (XSLFTextParagraph para : ts.getTextParagraphs()) {
                    String text = para.getText() == null ? "" : para.getText().replaceAll("\\s+", " ").strip();
                    if (text.isEmpty()) continue;
                    StringBuilder html = new StringBuilder();
                    boolean allBold = true;
                    for (XSLFTextRun run : para.getTextRuns()) {
                        String raw = run.getRawText();
                        if (raw != null && !raw.isBlank()) allBold &= run.isBold();
                        html.append(Html.run(raw, run.isBold(), run.isItalic()));
                    }
                    boolean bullet = para.isBullet() || para.getIndentLevel() > 0;
                    out.add(new DocBlock(bullet ? Kind.LIST_ITEM : Kind.PARAGRAPH, bullet ? para.getIndentLevel() * 2 : 0, text, html.toString(), allBold));
                }
            }
        }
    }

    // ------------------------------------------------------------ PowerPoint 97-2003 .ppt

    private Extracted ppt(InputStream in) throws IOException {
        List<DocBlock> blocks = new ArrayList<>();
        String title = null;
        try (HSLFSlideShow ppt = new HSLFSlideShow(in)) {
            for (HSLFSlide slide : ppt.getSlides()) {
                String slideTitle = slide.getTitle() == null ? "" : slide.getTitle().replaceAll("\\s+", " ").strip();
                if (title == null && !slideTitle.isEmpty()) title = slideTitle;
                blocks.add(new DocBlock(Kind.SLIDE, 2, slideTitle, Html.escape(slideTitle), true));
                for (List<HSLFTextParagraph> paras : slide.getTextParagraphs()) {
                    String text = HSLFTextParagraph.getText(paras);
                    if (text == null) continue;
                    for (String line : text.split("[\\r\\n\\u000b]+")) {
                        String l = line.strip();
                        if (!l.isEmpty() && !l.equals(slideTitle)) blocks.add(DocBlock.of(Kind.LIST_ITEM, l));
                    }
                }
            }
        }
        return new Extracted("ppt", null, null, blocks);
    }

    // ------------------------------------------------------------ PDF

    /** Ligne de texte d'un PDF avec sa taille de police moyenne. */
    record PdfLine(String text, double size, boolean bold, int page) {
    }

    private static final class LineStripper extends PDFTextStripper {

        final List<PdfLine> lines = new ArrayList<>();
        private final StringBuilder current = new StringBuilder();
        private double sizeSum;
        private int chars;
        private int boldChars;
        private int page;

        LineStripper() throws IOException {
            setSortByPosition(true);
        }

        @Override
        protected void writeString(String text, List<TextPosition> positions) {
            current.append(text);
            for (TextPosition t : positions) {
                sizeSum += t.getFontSizeInPt();
                chars++;
                String font = t.getFont() == null ? null : t.getFont().getName();
                if (font != null && font.toLowerCase(Locale.ROOT).matches(".*(bold|black|heavy|semibold).*")) boldChars++;
            }
        }

        @Override
        protected void writeWordSeparator() {
            current.append(' ');
        }

        @Override
        protected void writeLineSeparator() {
            flush();
        }

        @Override
        protected void endPage(PDPage pdPage) throws IOException {
            flush();
            page++;
            super.endPage(pdPage);
        }

        private void flush() {
            String s = current.toString().replaceAll("\\s+", " ").strip();
            if (!s.isEmpty()) lines.add(new PdfLine(s, chars == 0 ? 0 : sizeSum / chars, chars > 0 && boldChars * 2 > chars, page));
            current.setLength(0);
            sizeSum = 0;
            chars = 0;
            boldChars = 0;
        }
    }

    private static final Pattern BULLET = Pattern.compile("^([•●▪◦‣■□➢➤✓✔\\-–*]|\\d{1,2}[.)]|[a-z][.)])\\s+(.*)$");

    private Extracted pdf(InputStream in) throws IOException {
        String title;
        List<PdfLine> lines;
        int pages;
        try (PDDocument doc = Loader.loadPDF(in.readAllBytes())) {
            if (doc.isEncrypted()) throw ApiException.badRequest("Ce PDF est protégé : retirez la protection avant de l'importer.");
            title = doc.getDocumentInformation() == null ? null : doc.getDocumentInformation().getTitle();
            pages = doc.getNumberOfPages();
            LineStripper stripper = new LineStripper();
            stripper.getText(doc);
            lines = stripper.lines;
        }
        if (lines.isEmpty()) {
            throw ApiException.badRequest("Ce PDF ne contient pas de texte sélectionnable (document scanné). Utilisez la version Word ou PowerPoint.");
        }

        // Retire les en-têtes / pieds de page répétés et les numéros de page
        Map<String, Integer> repeats = new HashMap<>();
        lines.forEach(l -> repeats.merge(l.text().replaceAll("\\d+", "#"), 1, Integer::sum));
        int threshold = Math.max(3, pages / 2);
        List<PdfLine> kept = lines.stream()
                .filter(l -> !(pages >= 3 && repeats.get(l.text().replaceAll("\\d+", "#")) >= threshold))
                .filter(l -> !l.text().matches("(?i)(page\\s*)?\\d+(\\s*(/|sur)\\s*\\d+)?"))
                .toList();

        // Taille du corps de texte = taille la plus fréquente (pondérée par la longueur)
        Map<Long, Integer> weights = new HashMap<>();
        kept.forEach(l -> weights.merge(Math.round(l.size() * 2), l.text().length(), Integer::sum));
        double body = weights.entrySet().stream().max(Map.Entry.comparingByValue()).map(e -> e.getKey() / 2.0).orElse(11.0);

        // Les titres : nettement plus grands, ou en gras et courts
        double h1Threshold = body * 1.35;
        boolean hasBigHeadings = kept.stream().anyMatch(l -> l.size() >= h1Threshold && l.text().length() <= 120);
        List<DocBlock> blocks = new ArrayList<>();
        StringBuilder paragraph = new StringBuilder();
        Runnable flushParagraph = () -> {
            if (paragraph.length() > 0) {
                blocks.add(DocBlock.of(Kind.PARAGRAPH, paragraph.toString().strip()));
                paragraph.setLength(0);
            }
        };
        int maxLen = kept.stream().mapToInt(l -> l.text().length()).max().orElse(80);
        for (PdfLine l : kept) {
            String t = l.text();
            boolean shortLine = t.length() <= 120 && !t.endsWith(",");
            int level = 0;
            if (shortLine && l.size() >= h1Threshold) level = 1;
            else if (shortLine && (l.size() >= body * 1.12 || (l.bold() && t.length() < 90 && !t.endsWith(".")))) level = hasBigHeadings ? 2 : 1;
            if (level > 0) {
                flushParagraph.run();
                // Un titre sur deux lignes : on fusionne avec le titre précédent de même niveau
                if (!blocks.isEmpty() && blocks.get(blocks.size() - 1).kind() == Kind.HEADING
                        && blocks.get(blocks.size() - 1).level() == level && blocks.get(blocks.size() - 1).text().length() < 60) {
                    DocBlock prev = blocks.remove(blocks.size() - 1);
                    String merged = prev.text() + " " + t;
                    blocks.add(new DocBlock(Kind.HEADING, level, merged, Html.escape(merged), true));
                } else {
                    blocks.add(new DocBlock(Kind.HEADING, level, t, Html.escape(t), true));
                }
                continue;
            }
            Matcher bullet = BULLET.matcher(t);
            if (bullet.matches()) {
                flushParagraph.run();
                blocks.add(new DocBlock(Kind.LIST_ITEM, Character.isDigit(t.charAt(0)) ? 1 : 0, bullet.group(2), Html.escape(bullet.group(2)), l.bold()));
                continue;
            }
            // Suite d'un élément de liste coupé sur deux lignes
            if (paragraph.length() == 0 && !blocks.isEmpty() && blocks.get(blocks.size() - 1).kind() == Kind.LIST_ITEM
                    && Character.isLowerCase(t.charAt(0))) {
                DocBlock prev = blocks.remove(blocks.size() - 1);
                String merged = prev.text() + " " + t;
                blocks.add(new DocBlock(Kind.LIST_ITEM, prev.level(), merged, Html.escape(merged), prev.bold()));
                continue;
            }
            paragraph.append(t).append(' ');
            boolean endOfSentence = t.matches(".*[.!?:;»”\"]$");
            if (endOfSentence && t.length() < maxLen * 0.85) flushParagraph.run();
        }
        flushParagraph.run();

        // Le tout premier titre très grand de la première page sert de titre de formation
        // (seulement s'il est plus grand que tous les autres titres et ne ressemble pas à un titre de module)
        if ((title == null || title.isBlank()) && !blocks.isEmpty() && blocks.get(0).kind() == Kind.HEADING) {
            PdfLine first = kept.get(0);
            double otherMax = kept.stream().skip(1).mapToDouble(PdfLine::size).max().orElse(0);
            boolean looksLikeModule = first.text().matches("(?iu)^(module|chapitre|partie|unit[ée]|s[ée]quence)\\b.*");
            if (first.size() >= body * 1.6 && first.size() > otherMax + 0.5 && !looksLikeModule) title = blocks.remove(0).text();
        }
        return new Extracted("pdf", title, null, blocks);
    }

    // ------------------------------------------------------------ Texte

    /** Texte en UTF-8, ou en Windows-1252 (« ANSI » du Bloc-notes) si le fichier n'est pas de l'UTF-8 valide. */
    static String decode(byte[] bytes) {
        try {
            return StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString().replace("﻿", "");
        } catch (CharacterCodingException e) {
            return new String(bytes, Charset.forName("windows-1252"));
        }
    }

    private Extracted text(InputStream in) throws IOException {
        List<DocBlock> blocks = new ArrayList<>();
        StringBuilder paragraph = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new StringReader(decode(in.readAllBytes())))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String t = line.strip();
                Matcher heading = Pattern.compile("^(#{1,3})\\s+(.+)$").matcher(t);
                Matcher bullet = BULLET.matcher(t);
                if (t.isEmpty() || heading.matches() || bullet.matches()) {
                    if (paragraph.length() > 0) blocks.add(DocBlock.of(Kind.PARAGRAPH, paragraph.toString().strip()));
                    paragraph.setLength(0);
                }
                if (heading.matches()) blocks.add(new DocBlock(Kind.HEADING, heading.group(1).length(), heading.group(2), Html.escape(heading.group(2)), true));
                else if (bullet.matches()) blocks.add(DocBlock.of(Kind.LIST_ITEM, bullet.group(2)));
                else if (!t.isEmpty()) paragraph.append(t).append(' ');
            }
        }
        if (paragraph.length() > 0) blocks.add(DocBlock.of(Kind.PARAGRAPH, paragraph.toString().strip()));
        return new Extracted("txt", null, null, blocks);
    }

    // ------------------------------------------------------------ Lignes (pour l'import de questions)

    /** Ligne de texte simple, avec l'information de mise en gras (utile pour repérer les bonnes réponses). */
    public record TextLine(String text, boolean bold, String listFormat, int listLevel) {

        public TextLine(String text, boolean bold) {
            this(text, bold, null, -1);
        }
    }

    public List<TextLine> lines(String filename, InputStream in) {
        String ext = extension(filename);
        try {
            // Lignes brutes (sans fusion en paragraphes) : chaque réponse a), b)… reste sur sa ligne
            if (ext.equals("docx")) return docxLines(in);
            if (ext.equals("txt") || ext.equals("md")) {
                return decode(in.readAllBytes()).lines().filter(l -> !l.isBlank()).map(l -> new TextLine(l.strip(), false)).toList();
            }
            if (ext.equals("pdf")) {
                try (PDDocument doc = Loader.loadPDF(in.readAllBytes())) {
                    LineStripper stripper = new LineStripper();
                    stripper.getText(doc);
                    return stripper.lines.stream()
                            .filter(l -> !l.text().matches("(?i)(page\\s*)?\\d+(\\s*(/|sur)\\s*\\d+)?"))
                            .map(l -> new TextLine(l.text(), l.bold())).toList();
                }
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.badRequest("Impossible de lire ce document.");
        }
        Extracted ex = extract(filename, in, null);
        List<TextLine> lines = new ArrayList<>();
        for (DocBlock b : ex.blocks()) {
            switch (b.kind()) {
                case IMAGE, TABLE -> {
                    if (b.kind() == Kind.TABLE && !b.text().isBlank()) lines.add(new TextLine(b.text(), false));
                }
                case LIST_ITEM -> lines.add(new TextLine(b.text(), b.bold(), b.level() % 2 == 1 ? "decimal" : "bullet", b.level() / 2));
                default -> {
                    for (String l : b.text().split("\\R")) if (!l.isBlank()) lines.add(new TextLine(l.strip(), b.bold()));
                }
            }
        }
        return lines;
    }

    /** Lignes d'un document Word, avec le format de la numérotation automatique (chiffres, lettres, puces). */
    private List<TextLine> docxLines(InputStream in) throws IOException {
        List<TextLine> lines = new ArrayList<>();
        try (XWPFDocument doc = new XWPFDocument(in)) {
            for (IBodyElement el : doc.getBodyElements()) {
                List<XWPFParagraph> paragraphs = new ArrayList<>();
                if (el instanceof XWPFParagraph p) paragraphs.add(p);
                else if (el instanceof XWPFTable t) t.getRows().forEach(r -> r.getTableCells().forEach(c -> paragraphs.addAll(c.getParagraphs())));
                for (XWPFParagraph p : paragraphs) {
                    String text = p.getText() == null ? "" : p.getText().strip();
                    if (text.isEmpty()) continue;
                    int bold = 0;
                    int total = 0;
                    for (XWPFRun r : p.getRuns()) {
                        String t = r.text();
                        if (t == null) continue;
                        int n = t.replaceAll("\\s", "").length();
                        total += n;
                        if (r.isBold()) bold += n;
                    }
                    boolean isBold = total > 0 && bold * 10 >= total * 6;
                    if (p.getNumID() != null) {
                        int ilvl = p.getNumIlvl() == null ? 0 : p.getNumIlvl().intValue();
                        lines.add(new TextLine(text, isBold, p.getNumFmt() == null ? "decimal" : p.getNumFmt(), ilvl));
                    } else {
                        lines.add(new TextLine(text, isBold));
                    }
                }
            }
        }
        return lines;
    }
}
