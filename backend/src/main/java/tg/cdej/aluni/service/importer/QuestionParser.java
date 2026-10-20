package tg.cdej.aluni.service.importer;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import tg.cdej.aluni.dto.ImportDtos.ParsedQuestion;
import tg.cdej.aluni.service.importer.DocumentExtractor.TextLine;

/**
 * Reconnaît des questions écrites librement dans un document.
 *
 * <pre>
 * 1. Quel élément affiche les informations ? (1 point)
 * a) Le clavier
 * b) L'écran            ← bonne réponse en gras, suivie de *, ou indiquée par « Réponse : b »
 * c) La souris
 * Réponse : b
 * </pre>
 *
 * Vrai/faux, réponses multiples, réponse courte (« Réponse : navigateur | navigateur web ») et exercices
 * pratiques (« [Pratique] … ») sont reconnus automatiquement.
 */
public final class QuestionParser {

    private static final Pattern NUMBERED = Pattern.compile("(?iu)^\\s*(?:(?:question|q)\\s*)?(\\d{1,3})\\s*[.)\\-:–]\\s*(.*)$");
    private static final Pattern QUESTION_WORD = Pattern.compile("(?iu)^\\s*(?:question|q)\\s*(\\d{1,3})\\s*[:.)\\-–]?\\s*(.*)$");
    private static final Pattern OPTION = Pattern.compile("^\\s*\\(?([a-hA-H])\\s*[).:\\-–]\\s+(.+)$");
    private static final Pattern OPTION_BULLET = Pattern.compile("^\\s*[-•●▪◦☐□○]\\s+(.+)$");
    private static final Pattern ANSWER = Pattern.compile(
            "(?iu)^\\s*(?:bonnes?\\s+r[ée]ponses?|r[ée]ponses?\\s+(?:correctes?|attendues?)|r[ée]ponses?|corrig[ée]|solution)\\s*[:=]\\s*(.+)$");
    private static final Pattern POINTS = Pattern.compile("(?iu)[(\\[]\\s*(\\d{1,2})\\s*(?:pts?|points?)\\s*[)\\]]");
    private static final Pattern TAG = Pattern.compile("(?iu)\\[\\s*(pratique|exercice|courte|vrai\\s*/?\\s*faux|vf|qcm|multiple|unique)\\s*]");
    private static final Pattern MARK_END = Pattern.compile("\\s*(\\*+|\\(x\\)|\\[x\\]|✓|✔|✅)\\s*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern MARK_START = Pattern.compile("^\\s*(\\*+|\\[x\\]|✓|✔|✅)\\s*", Pattern.CASE_INSENSITIVE);
    private static final Pattern LETTERS = Pattern.compile("(?iu)^[a-h](\\s*(,|;|/|\\+|&|et|and)\\s*[a-h])*\\.?$");
    private static final Pattern DIGITS = Pattern.compile("^\\d(\\s*(,|;|/|\\+|&|et)\\s*\\d)*\\.?$");
    private static final Pattern NOTE = Pattern.compile("(?iu)^\\s*(→|⇒|->|=>|nb\\s*:|n\\.b\\.|note\\s*:|remarque\\s*:|explication\\s*:|astuce\\s*:).*");
    private static final Set<String> TRUE = Set.of("vrai", "v", "true", "oui");
    private static final Set<String> FALSE = Set.of("faux", "f", "false", "non");

    private QuestionParser() {
    }

    private static final class Draft {
        int line;
        StringBuilder text = new StringBuilder();
        final List<String> options = new ArrayList<>();
        final List<Boolean> marked = new ArrayList<>();
        String answer;
    }

    static String fold(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").strip();
    }

    private static boolean isLetterList(String format) {
        return format != null && format.toLowerCase(Locale.ROOT).contains("letter");
    }

    public static List<ParsedQuestion> parse(List<TextLine> lines, boolean moduleQuiz) {
        List<Draft> drafts = new ArrayList<>();
        Draft q = null;
        for (int i = 0; i < lines.size(); i++) {
            TextLine line = lines.get(i);
            String t = line.text().strip();
            // Lignes vides, remarques et explications (« → … », « Note : … ») : ignorées
            if (t.isEmpty() || NOTE.matcher(t).matches()) continue;

            Matcher answer = ANSWER.matcher(t);
            if (answer.matches() && q != null) {
                q.answer = answer.group(1).strip();
                continue;
            }

            // Numérotation automatique de Word : chiffres = question, lettres / sous-niveaux = réponses
            if (line.listFormat() != null) {
                boolean option = q != null && (isLetterList(line.listFormat()) || line.listLevel() > 0
                        || (line.listFormat().equals("bullet") && !t.endsWith("?")));
                if (option) {
                    addOption(q, t, line.bold());
                } else {
                    q = start(drafts, i, stripNumber(t), line.bold());
                }
                continue;
            }

            Matcher word = QUESTION_WORD.matcher(t);
            Matcher numbered = NUMBERED.matcher(t);
            Matcher option = OPTION.matcher(t);
            Matcher bullet = OPTION_BULLET.matcher(t);
            if (word.matches()) {
                q = start(drafts, i, word.group(2), line.bold());
            } else if (numbered.matches() && !(q != null && q.options.isEmpty() && q.text.length() == 0)) {
                q = start(drafts, i, numbered.group(2), line.bold());
            } else if (q != null && option.matches()) {
                addOption(q, option.group(2), line.bold());
            } else if (q != null && bullet.matches()) {
                addOption(q, bullet.group(1), line.bold());
            } else if (q == null) {
                if (t.endsWith("?")) q = start(drafts, i, t, line.bold()); // question non numérotée
                // sinon : consigne ou introduction, ignorée
            } else if (q.answer != null) {
                if (t.endsWith("?")) q = start(drafts, i, t, line.bold());
                // sinon : explication après la réponse, ignorée
            } else if (q.options.isEmpty() && !q.text.toString().matches("(?s).*[.?!:]\\s*$")
                    && !TRUE.contains(fold(MARK_END.matcher(t).replaceAll(""))) && !FALSE.contains(fold(MARK_END.matcher(t).replaceAll("")))) {
                q.text.append(q.text.length() == 0 ? "" : " ").append(t); // énoncé sur plusieurs lignes
            } else if (t.endsWith("?") && !q.options.isEmpty()) {
                q = start(drafts, i, t, line.bold());
            } else if (t.length() <= 200) {
                addOption(q, t, line.bold()); // réponses non lettrées sous la question
            }
        }
        return drafts.stream().filter(d -> d.text.length() > 0 || !d.options.isEmpty()).map(d -> build(d, moduleQuiz)).toList();
    }

    private static String stripNumber(String t) {
        Matcher m = NUMBERED.matcher(t);
        return m.matches() ? m.group(2) : t;
    }

    private static Draft start(List<Draft> drafts, int index, String text, boolean questionBold) {
        Draft d = new Draft();
        d.line = index + 1;
        d.text.append(text.strip());
        drafts.add(d);
        return d;
    }

    private static void addOption(Draft q, String raw, boolean bold) {
        String text = raw.strip();
        boolean marked = false;
        Matcher end = MARK_END.matcher(text);
        if (end.find()) {
            marked = true;
            text = text.substring(0, end.start()).strip();
        }
        Matcher start = MARK_START.matcher(text);
        if (start.find()) {
            marked = true;
            text = text.substring(start.end()).strip();
        }
        q.options.add(text);
        q.marked.add(marked || bold);
    }

    private static ParsedQuestion build(Draft d, boolean moduleQuiz) {
        String text = d.text.toString();
        int points = 1;
        Matcher pm = POINTS.matcher(text);
        if (pm.find()) {
            points = Math.max(1, Integer.parseInt(pm.group(1)));
            text = pm.replaceAll("");
        }
        String tag = null;
        Matcher tm = TAG.matcher(text);
        if (tm.find()) {
            tag = fold(tm.group(1)).replaceAll("[\\s/]", "");
            text = tm.replaceAll("");
        }
        text = text.replaceAll("\\s+", " ").strip();

        List<String> options = new ArrayList<>(d.options);
        // Si toutes les réponses sont en gras (mise en forme générale), le gras n'indique rien
        List<Boolean> marked = new ArrayList<>(d.marked);
        boolean allMarked = !marked.isEmpty() && marked.stream().allMatch(Boolean::booleanValue);
        Set<Integer> correct = new LinkedHashSet<>();
        if (!allMarked) {
            for (int i = 0; i < marked.size(); i++) if (marked.get(i)) correct.add(i);
        }
        List<String> accepted = new ArrayList<>();
        String answer = d.answer == null ? null : d.answer.replaceAll("\\.$", "").strip();

        if (answer != null && !options.isEmpty()) {
            correct.clear();
            correct.addAll(answerIndexes(answer, options));
        }

        String type;
        String error = null;
        boolean trueFalseOptions = options.size() == 2 && TRUE.contains(fold(options.get(0))) && FALSE.contains(fold(options.get(1)));
        boolean answerTrueFalse = answer != null && (TRUE.contains(fold(answer)) || FALSE.contains(fold(answer)));

        if ("pratique".equals(tag) || "exercice".equals(tag)
                || (options.isEmpty() && answer == null && fold(text).matches("^(exercice|tp|travail pratique|activite pratique)\\b.*"))) {
            type = "pratique";
            options.clear();
            correct.clear();
        } else if (trueFalseOptions || (options.isEmpty() && answerTrueFalse) || "vf".equals(tag) || "vraifaux".equals(tag)) {
            type = "vraifaux";
            Integer value = null;
            if (answerTrueFalse) value = TRUE.contains(fold(answer)) ? 0 : 1;
            else if (correct.size() == 1) value = correct.iterator().next();
            options = List.of("Vrai", "Faux");
            correct.clear();
            if (value == null) error = "Indiquez si l'affirmation est vraie ou fausse (« Réponse : Vrai »).";
            else correct.add(value);
        } else if (options.size() >= 2) {
            type = correct.size() > 1 || "multiple".equals(tag) ? "multiple" : "unique";
            if (correct.isEmpty()) error = "Bonne réponse non indiquée : mettez-la en gras, ajoutez * après, ou une ligne « Réponse : b ».";
        } else if (options.size() == 1) {
            type = "unique";
            error = "Une seule réponse proposée : il en faut au moins deux.";
        } else if (answer != null) {
            type = "courte";
            accepted = Arrays.stream(answer.split("\\s*(\\||/|;|\\bou\\b)\\s*")).map(String::strip).filter(s -> !s.isEmpty()).toList();
            if (accepted.isEmpty()) error = "Réponse attendue vide.";
        } else {
            type = "courte";
            error = "Aucune réponse : ajoutez les choix a), b), c)… ou une ligne « Réponse : … ».";
        }
        if (text.isEmpty()) error = "Énoncé de la question manquant.";
        if (error == null && moduleQuiz && !type.equals("unique") && !type.equals("vraifaux")) {
            error = "Les quiz de module acceptent seulement les QCM à réponse unique et les vrai / faux.";
        }
        return new ParsedQuestion(d.line, type, text, options, new ArrayList<>(correct), accepted, points, error);
    }

    /** « b », « a, c », « 2 », ou le texte de la réponse. */
    private static List<Integer> answerIndexes(String answer, List<String> options) {
        List<Integer> result = new ArrayList<>();
        String a = answer.strip();
        if (LETTERS.matcher(a).matches()) {
            for (char c : a.toLowerCase(Locale.ROOT).replaceAll("\\bet\\b|\\band\\b", " ").toCharArray()) {
                if (c >= 'a' && c <= 'h' && c - 'a' < options.size()) result.add(c - 'a');
            }
            return result;
        }
        if (DIGITS.matcher(a).matches()) {
            for (char c : a.toCharArray()) {
                if (Character.isDigit(c) && c - '1' >= 0 && c - '1' < options.size()) result.add(c - '1');
            }
            return result;
        }
        for (String part : a.split("\\s*(;|\\||\\bet\\b)\\s*")) {
            for (int i = 0; i < options.size(); i++) {
                if (fold(options.get(i)).equals(fold(part))) result.add(i);
            }
        }
        if (result.isEmpty()) {
            for (int i = 0; i < options.size(); i++) if (fold(options.get(i)).equals(fold(a))) result.add(i);
        }
        return result;
    }
}
