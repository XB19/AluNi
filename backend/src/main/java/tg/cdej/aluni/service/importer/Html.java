package tg.cdej.aluni.service.importer;

import java.util.List;

/** Petits outils de construction HTML sûrs (tout texte est échappé). */
final class Html {

    private Html() {
    }

    static String escape(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }

    static String run(String text, boolean bold, boolean italic) {
        String h = escape(text);
        if (h.isBlank()) return h;
        if (italic) h = "<em>" + h + "</em>";
        if (bold) h = "<strong>" + h + "</strong>";
        return h;
    }

    static String link(String url, String innerHtml) {
        if (url == null || !url.matches("(?i)^(https?://|mailto:).*")) return innerHtml;
        return "<a href=\"" + escape(url) + "\">" + innerHtml + "</a>";
    }

    static String table(List<List<String>> rows) {
        StringBuilder sb = new StringBuilder("<table>");
        for (int i = 0; i < rows.size(); i++) {
            sb.append("<tr>");
            for (String cell : rows.get(i)) {
                String tag = i == 0 ? "th" : "td";
                sb.append('<').append(tag).append('>').append(escape(cell)).append("</").append(tag).append('>');
            }
            sb.append("</tr>");
        }
        return sb.append("</table>").toString();
    }

    static String image(String url) {
        return "<img src=\"" + escape(url) + "\" alt=\"\">";
    }
}
