package tg.cdej.aluni.service.importer;

/**
 * Élément de contenu extrait d'un document, indépendamment de son format d'origine.
 *
 * @param kind  nature du bloc
 * @param level niveau du titre (1, 2, 3…), 1 pour une liste numérotée, ou type de diapositive
 *              (0 = titre de la présentation, 1 = section, 2 = diapositive normale)
 * @param text  texte brut
 * @param html  rendu HTML (texte échappé, gras, italique, liens, tableau, image)
 * @param bold  le texte est entièrement en gras
 */
public record DocBlock(Kind kind, int level, String text, String html, boolean bold) {

    public enum Kind { TITLE, SUBTITLE, HEADING, PARAGRAPH, LIST_ITEM, TABLE, IMAGE, SLIDE }

    public static DocBlock of(Kind kind, String text) {
        return new DocBlock(kind, 0, text, Html.escape(text), false);
    }

    public DocBlock withKind(Kind newKind, int newLevel) {
        return new DocBlock(newKind, newLevel, text, html, bold);
    }

    public int words() {
        return text == null || text.isBlank() ? 0 : text.trim().split("\\s+").length;
    }
}
