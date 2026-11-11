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
 * Les réponses peuvent aussi être regroupées en bas du document, sous un titre « Réponses » / « Corrigé » :
 *
 * <pre>
 * Réponses
 * 1. b
 * 2. Vrai
 * 3. navigateur | navigateur web        (ou sur une ligne : « 1-b  2-Vrai  3-navigateur »)
 * </pre>
 *
 * Chaque réponse du corrigé est rattachée à la question du même numéro.
 * Vrai/faux, réponses multiples et réponse courte (« Réponse : navigateur | navigateur web ») sont reconnus
 * automatiquement. Toute question doit porter sa réponse : la correction est entièrement automatique, les
 * questions ouvertes ou exercices à rendre (« [Pratique] … ») sont donc signalés et non importés.
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
    /** Titre de la partie « corrigé » en bas du document (comparé au texte sans accents ni majuscules). */
    private static final Pattern KEY_HEADER = Pattern.compile("^(?:les\\s+)?(?:bonnes\\s+)?"
            + "(?:reponses?|corriges?|correction|cle(?:\\s+de\\s+correction)?|grille(?:\\s+de\\s+(?:correction|reponses?))?|solutions?)"
            + "(?:\\s+(?:de\\s+l'examen|du\\s+questionnaire|du\\s+quiz|de\\s+l'evaluation|aux\\s+questions|attendues?|types?|correctes?))?"
            + "\\s*[:.]?$");
    /** Repère « 1. », « 2) », « 3 : », « Question 4 – », « R5 = » dans le corrigé ; plusieurs par ligne possibles. */
    private static final Pattern KEY_MARK = Pattern.compile(
            "(?iu)(?:^|(?<=[\\s;,]))(?:(?:question|r[ée]ponse|q|r)\\s*)?(\\d{1,3})\\s*[.)\\-:–=|/]\\s*");
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
        /** Numéro écrit dans le document (« 3. … »), sinon null. */
        Integer number;
        /** Le document a un corrigé en bas : réponse attendue depuis ce corrigé. */
        boolean keyExpected;
        boolean fromKey;
        /** Numéro sous lequel la réponse est cherchée dans le corrigé. */
        int keyNumber;
    }

    static String fold(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").strip();
    }

    private static boolean isLetterList(String format) {
        return format != null && format.toLowerCase(Locale.ROOT).contains("letter");
    }

    public static List<ParsedQuestion> parse(List<TextLine> lines, boolean moduleQuiz) {
        // Corrigé en bas du document : les questions sont au-dessus, les réponses en dessous
        int keyStart = answerKeyStart(lines);
        List<TextLine> body = keyStart < 0 ? lines : lines.subList(0, keyStart);
        List<Draft> drafts = parseQuestions(body);
        if (keyStart >= 0) applyKey(drafts, readKey(lines.subList(keyStart + 1, lines.size())));
        return drafts.stream().filter(d -> d.text.length() > 0 || !d.options.isEmpty()).map(d -> build(d, moduleQuiz)).toList();
    }

    /** Index du dernier titre « Réponses / Corrigé… » suivi d'au moins une réponse numérotée, sinon -1. */
    private static int answerKeyStart(List<TextLine> lines) {
        for (int i = lines.size() - 1; i >= 0; i--) {
            String t = fold(lines.get(i).text()).replaceAll("^[#*\\-–=_\\s]+|[\\s*=_]+$", "");
            if (KEY_HEADER.matcher(t).matches() && !readKey(lines.subList(i + 1, lines.size())).isEmpty()) return i;
        }
        return -1;
    }

    /** Lit le corrigé : numéro de question → réponse, dans l'ordre du document. */
    private static java.util.Map<Integer, String> readKey(List<TextLine> lines) {
        java.util.Map<Integer, String> key = new java.util.LinkedHashMap<>();
        int last = 0;
        for (TextLine line : lines) {
            String t = line.text().strip();
            if (t.isEmpty() || NOTE.matcher(t).matches()) continue;
            List<int[]> marks = new ArrayList<>(); // {début du repère, début de la réponse, numéro}
            Matcher m = KEY_MARK.matcher(t);
            while (m.find()) marks.add(new int[] {m.start(), m.end(), Integer.parseInt(m.group(1))});
            // Un repère suivi d'aucun texte (« … Windows 10. ») fait partie de la réponse précédente
            marks.removeIf(mk -> {
                int next = marks.stream().filter(o -> o[0] > mk[0]).mapToInt(o -> o[0]).min().orElse(t.length());
                return t.substring(mk[1], next).replaceAll("[\\s;,]", "").isEmpty();
            });
            if (marks.isEmpty() || marks.get(0)[0] > 0) {
                // Liste numérotée automatiquement par Word : le numéro n'est pas dans le texte
                if (line.listFormat() != null && !isLetterList(line.listFormat()) && marks.isEmpty()) key.put(last = last + 1, t);
                continue;
            }
            for (int k = 0; k < marks.size(); k++) {
                int end = k + 1 < marks.size() ? marks.get(k + 1)[0] : t.length();
                String answer = t.substring(marks.get(k)[1], end).replaceAll("[\\s;,]+$", "").strip();
                if (!answer.isEmpty()) key.put(last = marks.get(k)[2], answer);
            }
        }
        return key;
    }

    /** Rattache chaque réponse du corrigé à la question de même numéro (ou de même rang si les questions ne sont pas numérotées). */
    private static void applyKey(List<Draft> drafts, java.util.Map<Integer, String> key) {
        for (int i = 0; i < drafts.size(); i++) {
            Draft d = drafts.get(i);
            d.keyExpected = true;
            d.keyNumber = d.number != null ? d.number : i + 1;
            String answer = key.get(d.keyNumber);
            if (answer != null && d.answer == null) {
                d.answer = answer;
                d.fromKey = true;
            }
        }
    }

    private static List<Draft> parseQuestions(List<TextLine> lines) {
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
                q.number = Integer.valueOf(word.group(1));
            } else if (numbered.matches() && !(q != null && q.options.isEmpty() && q.text.length() == 0)) {
                q = start(drafts, i, numbered.group(2), line.bold());
                q.number = Integer.valueOf(numbered.group(1));
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
        return drafts;
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
        // Messages précis quand les réponses sont regroupées dans un corrigé en bas du document
        String missing = d.keyExpected && answer == null
                ? "Réponse absente du corrigé : ajoutez la ligne « " + d.keyNumber + ". … » dans le corrigé (partie « Réponses ») en bas du document."
                : null;
        String unmatched = d.fromKey
                ? "La réponse « " + answer + " » du corrigé ne correspond à aucun choix de la question " + d.keyNumber + "."
                : null;
        boolean trueFalseOptions = options.size() == 2 && TRUE.contains(fold(options.get(0))) && FALSE.contains(fold(options.get(1)));
        boolean answerTrueFalse = answer != null && (TRUE.contains(fold(answer)) || FALSE.contains(fold(answer)));

        if ("pratique".equals(tag) || "exercice".equals(tag)
                || (options.isEmpty() && answer == null && fold(text).matches("^(exercice|tp|travail pratique|activite pratique)\\b.*"))) {
            type = "courte";
            options.clear();
            correct.clear();
            error = "Exercice à rendre : il ne peut pas être corrigé automatiquement. Transformez-le en QCM, vrai / faux "
                    + "ou réponse courte avec sa réponse (« Réponse : … »).";
        } else if (trueFalseOptions || (options.isEmpty() && answerTrueFalse) || "vf".equals(tag) || "vraifaux".equals(tag)) {
            type = "vraifaux";
            Integer value = null;
            if (answerTrueFalse) value = TRUE.contains(fold(answer)) ? 0 : 1;
            else if (correct.size() == 1) value = correct.iterator().next();
            options = List.of("Vrai", "Faux");
            correct.clear();
            if (value == null) error = missing != null ? missing : unmatched != null ? unmatched : "Indiquez si l'affirmation est vraie ou fausse (« Réponse : Vrai »).";
            else correct.add(value);
        } else if (options.size() >= 2) {
            type = correct.size() > 1 || "multiple".equals(tag) ? "multiple" : "unique";
            if (correct.isEmpty()) error = missing != null ? missing : unmatched != null ? unmatched
                    : "Bonne réponse non indiquée : mettez-la en gras, ajoutez * après, ou une ligne « Réponse : b ».";
        } else if (options.size() == 1) {
            type = "unique";
            error = "Une seule réponse proposée : il en faut au moins deux.";
        } else if (answer != null) {
            type = "courte";
            accepted = Arrays.stream(answer.split("\\s*(\\||/|;|\\bou\\b)\\s*")).map(String::strip).filter(s -> !s.isEmpty()).toList();
            if (accepted.isEmpty()) error = "Réponse attendue vide.";
        } else {
            type = "courte";
            error = missing != null ? missing : "Aucune réponse : ajoutez les choix a), b), c)… ou une ligne « Réponse : … ».";
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
        Matcher withText = OPTION.matcher(a); // « b) L'écran » : la lettre suffit
        if (withText.matches() && withText.group(1).toLowerCase(Locale.ROOT).charAt(0) - 'a' < options.size()) {
            a = withText.group(1);
        }
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
