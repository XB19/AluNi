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
                    + "Une leçon intitulée « Exercice … » ou « TP … » devient un exercice à rendre. Supprimez ces consignes avant l'import.");

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
            note(doc, TEMPLATE_NOTE + " Règles : numérotez chaque question (1., 2., …). Écrivez les choix sous la question (a), b), c)…). "
                    + "Indiquez la bonne réponse en la mettant en GRAS, en ajoutant * à la fin, ou avec une ligne « Réponse : b ». "
                    + "Plusieurs bonnes réponses = question à choix multiples. Ajoutez « (2 points) » pour changer le barème. "
                    + "Supprimez ces consignes et les exemples avant l'import.");

            text(doc, "1. Quel élément permet d'afficher les informations à l'écran ?");
            text(doc, "a) Le clavier");
            line(doc, "b) L'écran (moniteur)", true, 11, null);
            text(doc, "c) La souris");
            note(doc, "→ Bonne réponse en gras.");

            text(doc, "2. Lesquels sont des périphériques d'entrée ? (2 points)");
            text(doc, "a) Le clavier *");
            text(doc, "b) L'imprimante");
            text(doc, "c) La souris *");
            note(doc, "→ Plusieurs bonnes réponses marquées d'une étoile : question à choix multiples.");

            text(doc, "3. Quel raccourci clavier permet de copier ?");
            text(doc, "a) Ctrl + V");
            text(doc, "b) Ctrl + C");
            text(doc, "c) Ctrl + X");
            text(doc, "Réponse : b");

            text(doc, "4. Une clé USB permet de transporter des fichiers d'un ordinateur à un autre.");
            text(doc, "Réponse : Vrai");
            note(doc, "→ Réponse Vrai ou Faux : question vrai / faux.");

            text(doc, "5. Comment appelle-t-on le logiciel qui permet de naviguer sur Internet ?");
            text(doc, "Réponse : navigateur | navigateur web");
            note(doc, "→ Sans choix proposés : réponse courte (séparez les variantes acceptées par |).");

            text(doc, "6. [Pratique] Créez un dossier « Mes documents » et déposez une capture d'écran. (5 points)");
            note(doc, "→ Exercice corrigé par le formateur.");
            return bytes(doc);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
