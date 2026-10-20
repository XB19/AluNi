package tg.cdej.aluni.service.importer;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.dto.CourseDtos.LessonEdit;
import tg.cdej.aluni.dto.CourseDtos.ModuleEdit;
import tg.cdej.aluni.dto.ImportDtos.CourseImportPreview;
import tg.cdej.aluni.service.StorageService;
import tg.cdej.aluni.service.importer.DocBlock.Kind;
import tg.cdej.aluni.service.importer.DocumentExtractor.Extracted;

/**
 * Transforme un document (Word, PowerPoint, PDF, texte) en formation : modules, leçons et contenu mis en forme.
 * Le résultat est un aperçu modifiable ; rien n'est enregistré tant que le formateur ne valide pas.
 */
@Service
public class CourseImportService {

    private static final Pattern MODULE_LINE = Pattern.compile(
            "(?iu)^(module|chapitre|partie|unit[ée]|s[ée]quence|th[èe]me)\\s*([0-9]+|[IVXL]+)\\b.*");
    private static final Pattern LESSON_LINE = Pattern.compile(
            "(?iu)^((le[çc]on|s[ée]ance|section|activit[ée]|cours|exercice|tp|projet|devoir|atelier)\\s*[0-9]+(\\.[0-9]+)*\\b.*|[0-9]+\\.[0-9]+\\.?\\s+\\S.*)$");
    private static final int MIN_INTRO_WORDS = 80;
    private static final Pattern BULLET_TEXT = Pattern.compile("^([-•●▪◦‣■➢➤✓✔]|\\d{1,2}[.)])\\s+(.*)$");
    private static final Pattern PRACTICAL = Pattern.compile(
            "(?iu)\\b(exercices?|tp|travaux pratiques|projets?|devoirs?|à rendre|a rendre|atelier|mise en pratique)\\b");
    private static final int WORDS_PER_LESSON = 700;

    private final DocumentExtractor extractor;
    private final StorageService storage;

    public CourseImportService(DocumentExtractor extractor, StorageService storage) {
        this.extractor = extractor;
        this.storage = storage;
    }

    public CourseImportPreview preview(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Aucun fichier reçu.");
        String name = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        String ext = DocumentExtractor.extension(name);
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw ApiException.badRequest("Impossible de lire le fichier.");
        }
        int[] images = { 0 };
        Extracted ex = extractor.extract(name, new ByteArrayInputStream(bytes), (data, imgExt) -> {
            images[0]++;
            return storage.storePublicBytes(data, "cours/images", imgExt);
        });
        if (ex.blocks().stream().allMatch(b -> b.text().isBlank() && b.kind() != Kind.IMAGE)) {
            throw ApiException.badRequest("Aucun contenu n'a pu être extrait de ce document.");
        }
        // Le document d'origine reste disponible au téléchargement pour les apprenants
        String sourceUrl = storage.storePublicBytes(bytes, "cours/originaux", ext);

        // Sans titre dans les propriétés : une première ligne courte en gras sert de titre de formation
        if ((ex.title() == null || ex.title().isBlank()) && !ex.slides() && !ex.blocks().isEmpty()) {
            DocBlock first = ex.blocks().get(0);
            if (first.kind() == Kind.PARAGRAPH && first.bold() && first.text().length() <= 120
                    && !MODULE_LINE.matcher(first.text()).matches()) {
                List<DocBlock> rest = new ArrayList<>(ex.blocks().subList(1, ex.blocks().size()));
                ex = new Extracted(ex.format(), first.text(), ex.subtitle(), rest);
            }
        }

        List<String> warnings = new ArrayList<>();
        List<ModuleEdit> modules = ex.slides() ? fromSlides(ex.blocks(), warnings) : fromDocument(promote(ex.blocks()), title(ex, name), warnings);
        modules = modules.stream().filter(m -> !m.lessons().isEmpty()).toList();
        if (modules.isEmpty()) throw ApiException.badRequest("Aucun contenu exploitable n'a été trouvé dans ce document.");
        int lessons = modules.stream().mapToInt(m -> m.lessons().size()).sum();
        if (images[0] > 0) warnings.add(images[0] + " image(s) importée(s) dans les leçons.");
        if (ext.equals("pdf")) warnings.add("PDF : la structure est déduite de la taille des caractères. Vérifiez le découpage en modules et leçons.");
        if (ext.equals("doc") || ext.equals("ppt")) warnings.add("Ancien format Office : seul le texte est importé (enregistrez en .docx / .pptx pour garder les images).");
        return new CourseImportPreview(title(ex, name), shortDescription(ex), ext, sourceUrl, name, modules, warnings, lessons, images[0]);
    }

    private static String title(Extracted ex, String filename) {
        if (ex.title() != null && !ex.title().isBlank()) return trim(ex.title(), 200);
        String base = filename.replaceAll("\\.[^.]+$", "").replaceAll("[_\\-]+", " ").strip();
        return base.isEmpty() ? "Nouvelle formation" : Character.toUpperCase(base.charAt(0)) + base.substring(1);
    }

    private static String shortDescription(Extracted ex) {
        if (ex.subtitle() != null && !ex.subtitle().isBlank()) return trim(ex.subtitle(), 300);
        return ex.blocks().stream()
                .filter(b -> b.kind() == Kind.PARAGRAPH && b.words() >= 8 && !b.text().startsWith(ImportTemplates.TEMPLATE_NOTE))
                .findFirst()
                .map(b -> trim(b.text(), 250)).orElse(null);
    }

    private static String trim(String s, int max) {
        String t = s.replaceAll("\\s+", " ").strip();
        return t.length() <= max ? t : t.substring(0, max - 1).replaceAll("\\s+\\S*$", "") + "…";
    }

    /** Repère les titres écrits « à la main » (« Module 1 : … », « Leçon 1.2 … », lignes en gras) et les listes tapées. */
    static List<DocBlock> promote(List<DocBlock> blocks) {
        boolean hasHeadings = blocks.stream().anyMatch(b -> b.kind() == Kind.HEADING);
        List<DocBlock> out = new ArrayList<>();
        for (DocBlock b : blocks) {
            if (b.text().startsWith(ImportTemplates.TEMPLATE_NOTE)) continue; // consignes du modèle oubliées
            if (b.kind() != Kind.PARAGRAPH) {
                out.add(b);
                continue;
            }
            String t = b.text();
            boolean shortLine = t.length() <= 120 && !t.endsWith(".");
            if (shortLine && (!hasHeadings || b.bold()) && MODULE_LINE.matcher(t).matches()) out.add(b.withKind(Kind.HEADING, 1));
            else if (shortLine && (!hasHeadings || b.bold()) && LESSON_LINE.matcher(t).matches()) out.add(b.withKind(Kind.HEADING, 2));
            else {
                Matcher bullet = BULLET_TEXT.matcher(t);
                if (bullet.matches()) {
                    String item = bullet.group(2);
                    String html = b.html().replaceFirst("^(<strong>|<em>)*\\s*([-•●▪◦‣■➢➤✓✔]|\\d{1,2}[.)])\\s+", "$1");
                    out.add(new DocBlock(Kind.LIST_ITEM, Character.isDigit(t.charAt(0)) ? 1 : 0, item, html, b.bold()));
                } else {
                    out.add(b);
                }
            }
        }
        // Aucun titre du tout : les lignes courtes en gras servent de titres
        if (out.stream().noneMatch(b -> b.kind() == Kind.HEADING)) {
            out.replaceAll(b -> b.kind() == Kind.PARAGRAPH && b.bold() && b.text().length() <= 90 && !b.text().endsWith(".")
                    ? b.withKind(Kind.HEADING, 1) : b);
        }
        return out;
    }

    // ------------------------------------------------------------ Documents (Word, PDF, texte)

    /** Leçon en construction. */
    private static final class Draft {
        final String title;
        final List<DocBlock> content = new ArrayList<>();

        Draft(String title) {
            this.title = title;
        }

        int words() {
            return content.stream().mapToInt(DocBlock::words).sum();
        }
    }

    private static final class ModuleDraft {
        final String title;
        final List<Draft> lessons = new ArrayList<>();

        ModuleDraft(String title) {
            this.title = title;
        }
    }

    private List<ModuleEdit> fromDocument(List<DocBlock> blocks, String courseTitle, List<String> warnings) {
        TreeSet<Integer> levels = new TreeSet<>();
        blocks.stream().filter(b -> b.kind() == Kind.HEADING).forEach(b -> levels.add(b.level()));

        if (levels.isEmpty()) {
            warnings.add("Aucun titre n'a été détecté : le contenu a été découpé automatiquement. Utilisez les styles « Titre 1 » (modules) et « Titre 2 » (leçons) de Word pour un meilleur résultat.");
            ModuleDraft module = new ModuleDraft(courseTitle);
            Draft lesson = null;
            int part = 1;
            for (DocBlock b : blocks) {
                if (lesson == null || lesson.words() >= WORDS_PER_LESSON && b.kind() == Kind.PARAGRAPH) {
                    lesson = new Draft("Partie " + part++);
                    module.lessons.add(lesson);
                }
                lesson.content.add(b);
            }
            return List.of(toModule(module));
        }

        int moduleLevel = levels.first();
        Integer lessonLevel = levels.higher(moduleLevel);
        List<ModuleDraft> modules = new ArrayList<>();

        // Texte placé avant le premier titre : gardé comme introduction s'il est conséquent,
        // sinon ignoré (il sert déjà de résumé de la formation)
        int firstHeading = 0;
        while (firstHeading < blocks.size() && blocks.get(firstHeading).kind() != Kind.HEADING) firstHeading++;
        List<DocBlock> intro = blocks.subList(0, firstHeading);
        boolean keepIntro = intro.stream().mapToInt(DocBlock::words).sum() >= MIN_INTRO_WORDS
                || intro.stream().anyMatch(b -> b.kind() == Kind.IMAGE || b.kind() == Kind.TABLE);
        if (!keepIntro) blocks = blocks.subList(firstHeading, blocks.size());

        if (lessonLevel == null) {
            // Un seul niveau de titre : chaque titre devient une leçon
            List<Draft> lessons = new ArrayList<>();
            Draft current = null;
            for (DocBlock b : blocks) {
                if (b.kind() == Kind.HEADING) {
                    current = new Draft(b.text());
                    lessons.add(current);
                } else {
                    if (current == null) {
                        current = new Draft("Introduction");
                        lessons.add(current);
                    }
                    current.content.add(b);
                }
            }
            lessons.removeIf(l -> l.content.isEmpty() && l.title.equals("Introduction"));
            if (lessons.size() <= 6) {
                ModuleDraft m = new ModuleDraft(courseTitle);
                m.lessons.addAll(lessons);
                modules.add(m);
            } else {
                for (int i = 0; i < lessons.size(); i += 5) {
                    ModuleDraft m = new ModuleDraft("Partie " + (i / 5 + 1));
                    m.lessons.addAll(lessons.subList(i, Math.min(i + 5, lessons.size())));
                    modules.add(m);
                }
                warnings.add("Un seul niveau de titre détecté : les leçons ont été regroupées en parties de 5. Renommez les modules dans l'éditeur.");
            }
            return modules.stream().map(CourseImportService::toModule).toList();
        }

        ModuleDraft module = null;
        Draft lesson = null;
        for (DocBlock b : blocks) {
            if (b.kind() == Kind.HEADING && b.level() == moduleLevel) {
                module = new ModuleDraft(b.text());
                modules.add(module);
                lesson = null;
            } else if (b.kind() == Kind.HEADING && b.level() == lessonLevel) {
                if (module == null) {
                    module = new ModuleDraft("Introduction");
                    modules.add(module);
                }
                lesson = new Draft(b.text());
                module.lessons.add(lesson);
            } else {
                if (module == null) {
                    if (b.words() == 0 && b.kind() != Kind.IMAGE) continue;
                    module = new ModuleDraft("Introduction");
                    modules.add(module);
                }
                if (lesson == null) {
                    lesson = new Draft(module.lessons.isEmpty() ? "Présentation : " + module.title : "Suite");
                    module.lessons.add(lesson);
                }
                // Titres plus profonds : sous-titres à l'intérieur de la leçon
                lesson.content.add(b.kind() == Kind.HEADING ? new DocBlock(Kind.HEADING, 3, b.text(), b.html(), true) : b);
            }
        }
        return modules.stream().map(CourseImportService::toModule).toList();
    }

    // ------------------------------------------------------------ Présentations PowerPoint

    private List<ModuleEdit> fromSlides(List<DocBlock> blocks, List<String> warnings) {
        List<ModuleDraft> modules = new ArrayList<>();
        List<Draft> loose = new ArrayList<>();
        ModuleDraft module = null;
        Draft lesson = null;
        int slide = 0;
        boolean sections = blocks.stream().anyMatch(b -> b.kind() == Kind.SLIDE && b.level() == 1);
        for (DocBlock b : blocks) {
            if (b.kind() == Kind.SLIDE) {
                slide++;
                if (b.level() == 0) continue;
                if (b.level() == 1) {
                    module = new ModuleDraft(b.text().isBlank() ? "Partie " + (modules.size() + 1) : b.text());
                    modules.add(module);
                    lesson = null;
                    continue;
                }
                String title = b.text().isBlank() ? "Diapositive " + slide : b.text();
                String base = title.replaceAll("(?i)\\s*\\(?suite\\)?\\s*$", "").strip();
                if (lesson != null && lesson.title.equalsIgnoreCase(base)) continue; // même titre : on prolonge la leçon
                lesson = new Draft(base);
                if (sections && module != null) module.lessons.add(lesson);
                else if (sections) {
                    module = new ModuleDraft("Introduction");
                    modules.add(module);
                    module.lessons.add(lesson);
                } else loose.add(lesson);
            } else if (lesson != null) {
                lesson.content.add(b);
            }
        }
        if (!sections) {
            if (loose.size() <= 8) {
                ModuleDraft m = new ModuleDraft("Contenu de la formation");
                m.lessons.addAll(loose);
                modules.add(m);
            } else {
                for (int i = 0; i < loose.size(); i += 6) {
                    ModuleDraft m = new ModuleDraft("Partie " + (i / 6 + 1));
                    m.lessons.addAll(loose.subList(i, Math.min(i + 6, loose.size())));
                    modules.add(m);
                }
            }
            warnings.add("Aucune diapositive de section : les diapositives ont été regroupées automatiquement. Utilisez des diapositives « En-tête de section » pour définir les modules.");
        }
        warnings.add("Présentation : une leçon par diapositive (les notes du présentateur sont ajoutées au contenu).");
        return modules.stream().map(CourseImportService::toModule).toList();
    }

    // ------------------------------------------------------------ Rendu

    private static ModuleEdit toModule(ModuleDraft m) {
        List<LessonEdit> lessons = m.lessons.stream()
                .filter(l -> !l.content.isEmpty() || !l.title.isBlank())
                .map(l -> {
                    int minutes = Math.max(3, Math.round(l.words() / 100f) + (int) l.content.stream().filter(b -> b.kind() == Kind.IMAGE).count());
                    boolean practical = PRACTICAL.matcher(l.title).find();
                    return new LessonEdit(null, trim(l.title, 200), "texte", minutes + " min", render(l.content), null, null, practical);
                })
                .toList();
        return new ModuleEdit(null, trim(m.title, 200), lessons);
    }

    static String render(List<DocBlock> blocks) {
        StringBuilder sb = new StringBuilder();
        String openList = null;
        for (DocBlock b : blocks) {
            if (b.kind() == Kind.LIST_ITEM) {
                String tag = b.level() % 2 == 1 ? "ol" : "ul";
                if (!tag.equals(openList)) {
                    if (openList != null) sb.append("</").append(openList).append('>');
                    sb.append('<').append(tag).append('>');
                    openList = tag;
                }
                sb.append("<li>").append(b.html()).append("</li>");
                continue;
            }
            if (openList != null) {
                sb.append("</").append(openList).append('>');
                openList = null;
            }
            switch (b.kind()) {
                case HEADING, SLIDE -> sb.append("<h3>").append(b.html()).append("</h3>");
                case TABLE, IMAGE -> sb.append(b.html());
                default -> {
                    if (!b.html().isBlank()) sb.append("<p>").append(b.html()).append("</p>");
                }
            }
        }
        if (openList != null) sb.append("</").append(openList).append('>');
        return sb.toString();
    }

    static String fold(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT).strip();
    }
}
