package tg.cdej.aluni.service.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xslf.usermodel.SlideLayout;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFSlideLayout;
import org.apache.poi.xslf.usermodel.XSLFSlideMaster;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFStyle;
import org.apache.poi.xwpf.usermodel.XWPFStyles;
import org.junit.jupiter.api.Test;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTString;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTStyle;
import org.springframework.mock.web.MockMultipartFile;

import tg.cdej.aluni.config.AppProperties;
import tg.cdej.aluni.dto.CourseDtos.LessonEdit;
import tg.cdej.aluni.dto.CourseDtos.ModuleEdit;
import tg.cdej.aluni.dto.ImportDtos.CourseImportPreview;
import tg.cdej.aluni.dto.ImportDtos.ParsedQuestion;
import tg.cdej.aluni.service.StorageService;
import tg.cdej.aluni.service.importer.DocumentExtractor.TextLine;

class ImportTests {

    private final DocumentExtractor extractor = new DocumentExtractor();
    private final CourseImportService courses;

    ImportTests() throws Exception {
        AppProperties props = new AppProperties("http://localhost", List.of(), "x".repeat(40), 1, "secret",
                "target/test-import", false, "pw", List.of());
        courses = new CourseImportService(extractor, new StorageService(props));
    }

    private static MockMultipartFile file(String name, byte[] bytes) {
        return new MockMultipartFile("file", name, "application/octet-stream", bytes);
    }

    private static void style(XWPFStyles styles, String id, String name) {
        CTStyle ct = CTStyle.Factory.newInstance();
        ct.setStyleId(id);
        CTString n = CTString.Factory.newInstance();
        n.setVal(name);
        ct.setName(n);
        styles.addStyle(new XWPFStyle(ct));
    }

    private static void para(XWPFDocument doc, String style, String text, boolean bold) {
        var p = doc.createParagraph();
        if (style != null) p.setStyle(style);
        var r = p.createRun();
        r.setText(text);
        r.setBold(bold);
    }

    private static List<String> titles(List<ModuleEdit> modules) {
        return modules.stream().map(ModuleEdit::title).toList();
    }

    @Test
    void wordWithHeadingStylesBecomesModulesAndLessons() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (XWPFDocument doc = new XWPFDocument()) {
            XWPFStyles styles = doc.createStyles();
            style(styles, "Titre", "Title");
            style(styles, "Titre1", "heading 1");
            style(styles, "Titre2", "heading 2");
            para(doc, "Titre", "Excel pour débutants", false);
            para(doc, null, "Une formation pratique pour apprendre à utiliser un tableur au quotidien.", false);
            para(doc, "Titre1", "Les bases", false);
            para(doc, "Titre2", "Découvrir l'interface", false);
            para(doc, null, "Le ruban regroupe les commandes.", false);
            para(doc, "Titre2", "Saisir des données", false);
            para(doc, null, "Cliquez dans une cellule puis tapez.", false);
            para(doc, "Titre1", "Les formules", false);
            para(doc, "Titre2", "La fonction SOMME", false);
            para(doc, null, "=SOMME(A1:A10) additionne les cellules.", true);
            para(doc, "Titre2", "Exercice : budget du mois", false);
            para(doc, null, "Réalisez le budget et déposez votre fichier.", false);
            doc.write(out);
        }
        CourseImportPreview preview = courses.preview(file("excel.docx", out.toByteArray()));
        assertThat(preview.title()).isEqualTo("Excel pour débutants");
        assertThat(titles(preview.modules())).containsExactly("Les bases", "Les formules");
        assertThat(preview.lessonCount()).isEqualTo(4);
        LessonEdit somme = preview.modules().get(1).lessons().get(0);
        assertThat(somme.title()).isEqualTo("La fonction SOMME");
        assertThat(somme.content()).contains("<strong>=SOMME(A1:A10) additionne les cellules.</strong>");
        assertThat(preview.modules().get(1).lessons().get(1).practical()).isTrue();
        assertThat(preview.sourceUrl()).startsWith("/files/cours/originaux/");
    }

    @Test
    void wordTemplateWithWrittenTitlesIsUnderstood() throws Exception {
        CourseImportPreview preview = courses.preview(file("modele.docx", new ImportTemplates().course()));
        assertThat(preview.title()).isEqualTo("Titre de votre formation");
        assertThat(titles(preview.modules())).containsExactly("Module 1 : Découvrir l'ordinateur", "Module 2 : Fichiers et dossiers");
        ModuleEdit first = preview.modules().get(0);
        assertThat(first.lessons()).extracting(LessonEdit::title)
                .containsExactly("Leçon 1.1 : Qu'est-ce qu'un ordinateur ?", "Leçon 1.2 : Allumer et éteindre correctement");
        assertThat(first.lessons().get(0).content()).contains("<ul><li>l'unité centrale").contains("l'écran");
        LessonEdit exercise = preview.modules().get(1).lessons().get(1);
        assertThat(exercise.title()).isEqualTo("Exercice 2.2 : Organiser ses documents");
        assertThat(exercise.practical()).isTrue();
    }

    @Test
    void powerPointSectionsBecomeModulesAndSlidesLessons() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (XMLSlideShow ppt = new XMLSlideShow()) {
            XSLFSlideMaster master = ppt.getSlideMasters().get(0);
            XSLFSlideLayout titleLayout = master.getLayout(SlideLayout.TITLE);
            XSLFSlideLayout section = master.getLayout(SlideLayout.SECTION_HEADER);
            XSLFSlideLayout content = master.getLayout(SlideLayout.TITLE_AND_CONTENT);
            XSLFSlide s0 = ppt.createSlide(titleLayout);
            s0.getPlaceholder(0).setText("Sécurité en ligne");
            s0.getPlaceholder(1).setText("Protéger ses comptes et sa vie privée");
            ppt.createSlide(section).getPlaceholder(0).setText("Les mots de passe");
            XSLFSlide s2 = ppt.createSlide(content);
            s2.getPlaceholder(0).setText("Un bon mot de passe");
            s2.getPlaceholder(1).setText("Au moins 12 caractères\nDes chiffres et des symboles");
            XSLFSlide s3 = ppt.createSlide(content);
            s3.getPlaceholder(0).setText("Un bon mot de passe (suite)");
            s3.getPlaceholder(1).setText("Jamais le même partout");
            ppt.createSlide(section).getPlaceholder(0).setText("Les arnaques");
            XSLFSlide s5 = ppt.createSlide(content);
            s5.getPlaceholder(0).setText("Reconnaître un faux SMS");
            s5.getPlaceholder(1).setText("On vous demande un code : méfiance !");
            ppt.write(out);
        }
        CourseImportPreview preview = courses.preview(file("securite.pptx", out.toByteArray()));
        assertThat(preview.title()).isEqualTo("Sécurité en ligne");
        assertThat(preview.shortDescription()).isEqualTo("Protéger ses comptes et sa vie privée");
        assertThat(titles(preview.modules())).containsExactly("Les mots de passe", "Les arnaques");
        LessonEdit password = preview.modules().get(0).lessons().get(0);
        assertThat(preview.modules().get(0).lessons()).hasSize(1); // la diapositive « (suite) » est fusionnée
        assertThat(password.content()).contains("Au moins 12 caractères").contains("Jamais le même partout");
    }

    @Test
    void pdfHeadingsAreDetectedFromFontSize() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float y = 740;
                Object[][] lines = {
                        { bold, 20f, "Module 1 : Internet" }, { bold, 14f, "Qu'est-ce qu'Internet ?" },
                        { regular, 11f, "Internet relie des millions d'ordinateurs dans le monde." },
                        { bold, 14f, "Le navigateur" }, { regular, 11f, "Le navigateur permet de visiter des sites web." },
                        { bold, 20f, "Module 2 : La messagerie" }, { bold, 14f, "Créer une adresse" },
                        { regular, 11f, "Choisissez un fournisseur puis remplissez le formulaire." } };
                for (Object[] l : lines) {
                    cs.beginText();
                    cs.setFont((PDType1Font) l[0], (float) l[1]);
                    cs.newLineAtOffset(60, y);
                    cs.showText((String) l[2]);
                    cs.endText();
                    y -= (float) l[1] * 2;
                }
            }
            doc.save(out);
        }
        CourseImportPreview preview = courses.preview(file("internet.pdf", out.toByteArray()));
        assertThat(titles(preview.modules())).containsExactly("Module 1 : Internet", "Module 2 : La messagerie");
        assertThat(preview.modules().get(0).lessons()).extracting(LessonEdit::title)
                .containsExactly("Qu'est-ce qu'Internet ?", "Le navigateur");
    }

    @Test
    void questionTemplateIsFullyRecognized() {
        List<TextLine> lines = extractor.lines("questions.docx", new ByteArrayInputStream(new ImportTemplates().questions()));
        List<ParsedQuestion> qs = QuestionParser.parse(lines, false);
        assertThat(qs).hasSize(6);
        assertThat(qs).allSatisfy(q -> assertThat(q.error()).isNull());
        assertThat(qs).extracting(ParsedQuestion::type).containsExactly("unique", "multiple", "unique", "vraifaux", "courte", "pratique");
        assertThat(qs.get(0).correct()).containsExactly(1); // réponse en gras
        assertThat(qs.get(1).correct()).containsExactly(0, 2);
        assertThat(qs.get(1).points()).isEqualTo(2);
        assertThat(qs.get(1).options()).containsExactly("Le clavier", "L'imprimante", "La souris");
        assertThat(qs.get(2).correct()).containsExactly(1); // « Réponse : b »
        assertThat(qs.get(3).correct()).containsExactly(0);
        assertThat(qs.get(4).accepted()).containsExactly("navigateur", "navigateur web");
        assertThat(qs.get(5).points()).isEqualTo(5);
    }

    @Test
    void plainTextQuestionsWithErrorsAreReported() {
        String text = """
                Quiz de révision

                Question 1 : Quelle touche efface le caractère à gauche ?
                A. Suppr
                B. Retour arrière
                Réponse : B

                2) Windows est un système d'exploitation.
                Vrai
                Faux *

                3. Quelle est la capitale du Togo ?
                a) Lomé
                b) Kara
                """;
        // Le même fichier enregistré en « ANSI » par le Bloc-notes de Windows
        List<ParsedQuestion> ansi = QuestionParser.parse(extractor.lines("quiz.txt",
                new ByteArrayInputStream(text.getBytes(Charset.forName("windows-1252")))), false);
        assertThat(ansi.get(0).correct()).containsExactly(1);
        List<TextLine> lines = extractor.lines("quiz.txt", new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)));
        List<ParsedQuestion> qs = QuestionParser.parse(lines, false);
        assertThat(qs).hasSize(3);
        assertThat(qs.get(0).correct()).containsExactly(1);
        assertThat(qs.get(1).type()).isEqualTo("vraifaux");
        assertThat(qs.get(1).correct()).containsExactly(1);
        assertThat(qs.get(2).error()).contains("Bonne réponse non indiquée");
    }
}
