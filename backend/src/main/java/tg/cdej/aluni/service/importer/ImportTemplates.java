package tg.cdej.aluni.service.importer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.stereotype.Component;

/** Modèles Word à télécharger, montrant comment rédiger un cours ou des questions importables. */
@Component
public class ImportTemplates {

    private static final String GREEN = "1A6F33";
    private static final String GREY = "6B7280";
    /** Repère des consignes du modèle : ces paragraphes sont ignorés à l'import. */
    public static final String TEMPLATE_NOTE = "[Consignes du modèle ALuNI – à supprimer]";

    private static XWPFRun line(XWPFDocument doc, String text, boolean bold, int size, String color) {
        XWPFParagraph p = doc.createParagraph();
        p.setSpacingAfter(120);
        XWPFRun r = p.createRun();
        r.setText(text);
        r.setBold(bold);
        r.setFontSize(size);
        r.setFontFamily("Calibri");
        if (color != null) r.setColor(color);
        return r;
    }

    private static void text(XWPFDocument doc, String text) {
        line(doc, text, false, 11, null);
    }

    private static void note(XWPFDocument doc, String text) {
        line(doc, text, false, 10, GREY).setItalic(true);
    }

    private static byte[] bytes(XWPFDocument doc) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        doc.write(out);
        return out.toByteArray();
    }

    public byte[] course() {
        try (XWPFDocument doc = new XWPFDocument()) {
            line(doc, "Titre de votre formation", true, 22, GREEN);
            note(doc, TEMPLATE_NOTE + " Comment préparer votre document : chaque ligne « Module … » devient un module, chaque ligne « Leçon … » devient une leçon, "
                    + "et le texte qui suit forme le contenu de la leçon (paragraphes, listes, tableaux et images sont conservés). "
                    + "Vous pouvez aussi utiliser les styles « Titre 1 » (modules) et « Titre 2 » (leçons) de Word. "
                    + "Une leçon « Exercice … » ou « TP … » est importée comme une leçon de mise en pratique. Les évaluations se font par les quiz "
                    + "et l'examen final, corrigés automatiquement. Supprimez ces consignes avant l'import.");

            line(doc, "Module 1 : Découvrir l'ordinateur", true, 16, GREEN);
            line(doc, "Leçon 1.1 : Qu'est-ce qu'un ordinateur ?", true, 13, null);
            text(doc, "Un ordinateur est une machine qui traite des informations. Il se compose de plusieurs éléments :");
            text(doc, "- l'unité centrale, qui fait les calculs ;");
            text(doc, "- l'écran, qui affiche les informations ;");
            text(doc, "- le clavier et la souris, qui permettent de donner des instructions.");
            line(doc, "Leçon 1.2 : Allumer et éteindre correctement", true, 13, null);
            text(doc, "Pour éteindre l'ordinateur, utilisez toujours le menu Démarrer puis « Arrêter ». Ne débranchez jamais le câble.");

            line(doc, "Module 2 : Fichiers et dossiers", true, 16, GREEN);
            line(doc, "Leçon 2.1 : Créer un dossier", true, 13, null);
            text(doc, "Faites un clic droit sur le bureau, choisissez « Nouveau » puis « Dossier », et donnez-lui un nom.");
            line(doc, "Exercice 2.2 : Organiser ses documents", true, 13, null);
            text(doc, "Créez un dossier « Mes documents ALuNI » contenant trois sous-dossiers, puis déposez une capture d'écran.");
            return bytes(doc);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    public byte[] questions() {
        try (XWPFDocument doc = new XWPFDocument()) {
            line(doc, "Questions – Titre de la formation", true, 20, GREEN);
            note(doc, TEMPLATE_NOTE + " Écrivez d'abord toutes vos questions, numérotées (1., 2., …), avec leurs choix a), b), c)… "
                    + "Puis, tout en bas, sous le titre « Réponses », la bonne réponse de chaque question avec le même numéro. "
                    + "La plateforme rattache chaque réponse à sa question et corrige automatiquement : vous n'avez rien à corriger. "
                    + "Ajoutez « (2 points) » à une question pour changer son barème. Remplacez les exemples par vos questions et "
                    + "supprimez ces consignes avant l'import.");

            line(doc, "Questions", true, 15, GREEN);
            text(doc, "1. Quel élément permet d'afficher les informations à l'écran ?");
            text(doc, "a) Le clavier");
            text(doc, "b) L'écran (moniteur)");
            text(doc, "c) La souris");

            text(doc, "2. Lesquels sont des périphériques d'entrée ? (2 points)");
            text(doc, "a) Le clavier");
            text(doc, "b) L'imprimante");
            text(doc, "c) La souris");

            text(doc, "3. Quel raccourci clavier permet de copier ?");
            text(doc, "a) Ctrl + V");
            text(doc, "b) Ctrl + C");
            text(doc, "c) Ctrl + X");

            text(doc, "4. Une clé USB permet de transporter des fichiers d'un ordinateur à un autre.");
            note(doc, "→ Sans choix : la réponse « Vrai » ou « Faux » en fait une question vrai / faux.");

            text(doc, "5. Comment appelle-t-on le logiciel qui permet de naviguer sur Internet ?");
            note(doc, "→ Sans choix : réponse courte, écrite par l'apprenant.");

            line(doc, "Réponses", true, 15, GREEN);
            text(doc, "1. b");
            text(doc, "2. a, c");
            note(doc, "→ Plusieurs lettres : question à choix multiples.");
            text(doc, "3. b");
            text(doc, "4. Vrai");
            text(doc, "5. navigateur | navigateur web");
            note(doc, "→ Séparez par | les différentes réponses acceptées.");
            return bytes(doc);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
