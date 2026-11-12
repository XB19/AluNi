package tg.cdej.aluni.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.models.beta.messages.BetaCacheControlEphemeral;
import com.anthropic.models.beta.messages.BetaMessage;
import com.anthropic.models.beta.messages.BetaOutputConfig;
import com.anthropic.models.beta.messages.BetaStopReason;
import com.anthropic.models.beta.messages.BetaTextBlockParam;
import com.anthropic.models.beta.messages.MessageCreateParams;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.config.AssistantProperties;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.AssistantDtos.ChatMessage;
import tg.cdej.aluni.dto.AssistantDtos.ChatReply;
import tg.cdej.aluni.dto.CourseDtos.CourseSummary;
import tg.cdej.aluni.dto.SiteDtos.FaqDto;

/**
 * Assistant de la plateforme : répond aux questions sur le fonctionnement d'ALuNI.
 *
 * <p>Avec une clé d'API, les réponses sont rédigées par Claude à partir du guide de la plateforme
 * ({@code resources/assistant/guide.md}), de la FAQ, du catalogue et des coordonnées de l'Académie, tous lus en direct.
 * Sans clé, ou si le service est indisponible, l'assistant renvoie la réponse de la FAQ la plus proche de la question.
 */
@Service
public class AssistantService {

    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);

    /** Longueur maximale d'une question, et nombre de messages récents transmis (le contexte utile d'une discussion). */
    static final int MAX_QUESTION = 1000;
    private static final int HISTORY = 12;

    private final AssistantProperties props;
    private final ContentService content;
    private final CatalogService catalog;
    private final SettingsService settings;
    private final String guide;
    private final Map<String, Deque<Long>> usage = new ConcurrentHashMap<>();
    private volatile AnthropicClient client;

    public AssistantService(AssistantProperties props, ContentService content, CatalogService catalog,
            SettingsService settings) throws IOException {
        this.props = props;
        this.content = content;
        this.catalog = catalog;
        this.settings = settings;
        try (InputStream in = new ClassPathResource("assistant/guide.md").getInputStream()) {
            this.guide = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    public boolean aiEnabled() {
        return props.aiEnabled();
    }

    /** Répond au dernier message de la conversation. {@code user} est null pour un visiteur non connecté. */
    public ChatReply chat(List<ChatMessage> messages, User user, String visitor) {
        List<ChatMessage> history = clean(messages);
        String question = history.get(history.size() - 1).content();
        if (question.length() > MAX_QUESTION) {
            throw ApiException.badRequest("Votre message est trop long (" + MAX_QUESTION + " caractères maximum).");
        }
        throttle(visitor);
        if (!props.aiEnabled()) return new ChatReply(fromFaq(question, user), "faq");
        try {
            return new ChatReply(ask(history, user), "ia");
        } catch (RuntimeException e) {
            log.warn("Assistant indisponible, réponse tirée de la FAQ : {}", e.toString());
            return new ChatReply(fromFaq(question, user), "faq");
        }
    }

    // ------------------------------------------------------------------ Conversation

    /** Garde les derniers échanges, en commençant par une question et en alternant question / réponse. */
    private static List<ChatMessage> clean(List<ChatMessage> messages) {
        List<ChatMessage> out = new ArrayList<>();
        for (ChatMessage m : messages) {
            String text = m.content() == null ? "" : m.content().strip();
            if (text.isEmpty()) continue;
            if (!out.isEmpty() && out.get(out.size() - 1).role().equals(m.role())) {
                ChatMessage last = out.remove(out.size() - 1);
                out.add(new ChatMessage(m.role(), last.content() + "\n\n" + text));
            } else {
                out.add(new ChatMessage(m.role(), text));
            }
        }
        if (out.size() > HISTORY) out = new ArrayList<>(out.subList(out.size() - HISTORY, out.size()));
        while (!out.isEmpty() && !"user".equals(out.get(0).role())) out.remove(0);
        if (out.isEmpty() || !"user".equals(out.get(out.size() - 1).role())) {
            throw ApiException.badRequest("Écrivez votre question.");
        }
        return out;
    }

    /** Limite le nombre de messages par visiteur et par heure. */
    private void throttle(String visitor) {
        long now = System.currentTimeMillis();
        long hourAgo = now - Duration.ofHours(1).toMillis();
        Deque<Long> times = usage.computeIfAbsent(visitor, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() < hourAgo) times.pollFirst();
            if (times.size() >= props.messagesPerHour()) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "Vous avez posé beaucoup de questions en peu de temps. Réessayez dans quelques minutes, ou consultez la FAQ.");
            }
            times.addLast(now);
        }
        if (usage.size() > 10_000) usage.entrySet().removeIf(e -> e.getValue().isEmpty());
    }

    // ------------------------------------------------------------------ Réponse rédigée par Claude

    private String ask(List<ChatMessage> history, User user) {
        MessageCreateParams.Builder params = MessageCreateParams.builder()
                .model(props.model())
                .maxTokens(4000L)
                // Discussion simple : un effort faible donne des réponses rapides et suffisamment précises
                .outputConfig(BetaOutputConfig.builder().effort(BetaOutputConfig.Effort.LOW).build())
                // En cas de refus du modèle, l'API réessaie d'elle-même sur un modèle de repli adapté
                .addBeta("server-side-fallback-2026-07-01")
                .putAdditionalBodyProperty("fallbacks", JsonValue.from("default"))
                .systemOfBetaTextBlockParams(List.of(
                        BetaTextBlockParam.builder().text(guide).build(),
                        // Données du site : identiques d'une question à l'autre, donc mises en cache
                        BetaTextBlockParam.builder().text(liveData())
                                .cacheControl(BetaCacheControlEphemeral.builder().build()).build(),
                        BetaTextBlockParam.builder().text(who(user)).build()));
        for (ChatMessage m : history) {
            if ("user".equals(m.role())) params.addUserMessage(m.content());
            else params.addAssistantMessage(m.content());
        }

        BetaMessage response = client().beta().messages().create(params.build());
        if (response.stopReason().filter(BetaStopReason.REFUSAL::equals).isPresent()) {
            return "Je ne peux pas répondre à cette demande. Je reste à votre disposition pour toute question sur la plateforme ALuNI, "
                    + "ses formations et ses certificats.";
        }
        String text = response.content().stream()
                .flatMap(block -> block.text().stream())
                .map(block -> block.text())
                .collect(Collectors.joining("\n\n"))
                .strip();
        if (text.isEmpty()) throw new IllegalStateException("Réponse vide");
        if (response.stopReason().filter(BetaStopReason.MAX_TOKENS::equals).isPresent()) text += " …";
        return text;
    }

    private AnthropicClient client() {
        AnthropicClient c = client;
        if (c == null) {
            synchronized (this) {
                if (client == null) {
                    client = AnthropicOkHttpClient.builder().apiKey(props.apiKey()).timeout(Duration.ofSeconds(60)).build();
                }
                c = client;
            }
        }
        return c;
    }

    /** Coordonnées, FAQ et catalogue, lus en direct pour que l'assistant reste à jour sans intervention (public pour les tests). */
    public String liveData() {
        Map<String, String> s = settings.all();
        StringBuilder b = new StringBuilder("# Coordonnées de l'Académie\n\n");
        line(b, "Nom", "l'" + s.get("academy.name") + " (" + s.get("academy.short") + ")");
        line(b, "Centre porteur", s.get("academy.center") + " (" + s.get("academy.code") + "), " + s.get("academy.city"));
        line(b, "Adresse", s.get("contact.address"));
        line(b, "Téléphone", s.get("contact.phone"));
        line(b, "WhatsApp", s.get("contact.whatsapp").isBlank() ? null : "+" + s.get("contact.whatsapp"));
        line(b, "E-mail", s.get("contact.email"));
        line(b, "Horaires", s.get("contact.hours"));

        b.append("\n# Questions fréquentes (FAQ officielle)\n\n");
        for (FaqDto f : content.faq()) b.append("Q : ").append(f.q()).append("\nR : ").append(f.a()).append("\n\n");

        b.append("# Catalogue des formations publiées\n\n");
        List<CourseSummary> courses = catalog.search(null, null);
        if (courses.isEmpty()) b.append("Aucune formation publiée pour le moment.\n");
        for (CourseSummary c : courses) {
            b.append("- [").append(c.title()).append("](/formations/").append(c.slug()).append(") : ")
                    .append(c.categoryName()).append(", niveau ").append(c.level().toLowerCase(Locale.FRENCH))
                    .append(", environ ").append(c.hours()).append(" h, inscription ")
                    .append("libre".equals(c.access()) ? "libre" : "sur validation")
                    .append(", délivre ").append(c.certTypes().stream()
                            .map(t -> "competence".equals(t) ? "un certificat de compétence" : "une attestation de suivi")
                            .collect(Collectors.joining(" et ")));
            if (c.shortDescription() != null && !c.shortDescription().isBlank()) b.append(". ").append(c.shortDescription().strip());
            b.append('\n');
        }
        return b.toString();
    }

    private static void line(StringBuilder b, String label, String value) {
        if (value != null && !value.isBlank()) b.append("- ").append(label).append(" : ").append(value).append('\n');
    }

    /** Profil de la personne : visiteur, apprenant, formateur ou admin (mêmes noms que dans fiches.md). */
    static String profile(User user) {
        if (user == null) return "visiteur";
        return user.getRole() == Role.ADMIN ? "admin" : user.getRole() == Role.FORMATEUR ? "formateur" : "apprenant";
    }

    /** Qui écrit (sans donnée personnelle), et comment adapter la réponse à son espace. */
    private static String who(User user) {
        String text = switch (profile(user)) {
            case "admin" -> "Membre de l'administration de l'Académie, connecté à l'espace administration (/admin). "
                    + "Réponds du point de vue de cet espace : Utilisateurs, Validations, Formations et catégories, Certificats, "
                    + "Site vitrine, Statistiques.";
            case "formateur" -> "Formateur connecté à son espace formateur (/formateur). Réponds du point de vue du formateur : "
                    + "créer et publier ses formations, la banque de questions, l'examen final et les sessions en salle, le suivi "
                    + "de ses apprenants. Une question comme « mes apprenants », « mes formations » ou « mes examens » porte sur ce "
                    + "qu'il gère, pas sur un parcours d'apprenant. Ne l'invite pas à créer un compte ni à s'inscrire.";
            case "apprenant" -> "Apprenant connecté à son espace apprenant (/apprenant). Réponds du point de vue de l'apprenant : "
                    + "ses formations, ses examens, ses certificats, ses notifications, son profil. Il a déjà un compte : ne l'invite "
                    + "pas à s'inscrire sur la plateforme. Les fonctions des formateurs ou de l'administration ne sont pas dans son "
                    + "espace : si on t'en parle, dis-le et explique à qui s'adresser.";
            default -> "Visiteur non connecté. S'il veut suivre une formation, indique-lui de créer un compte. Les fonctions des "
                    + "espaces apprenant, formateur et administration nécessitent d'être connecté avec le bon profil.";
        };
        return "# Personne qui écrit\n\n" + text;
    }

    // ------------------------------------------------------------------ Réponse sans IA : fiches d'aide et FAQ

    private static final Set<String> STOP = new HashSet<>(Arrays.asList(("le la les un une des de du d l a au aux et ou en "
            + "est sont je j me mon ma mes vous votre vos nous on il elle ils que qui quoi quel quelle quels quelles comment "
            + "pour par sur dans avec sans ce cet cette ces se sa son ses ne pas plus faire fait peut puis peux pourquoi "
            + "y a t ai as avoir etre suis bonjour merci svp s il plait c est qu dois doit faut veux voudrais "
            + "aimerais besoin aide aider").split(" ")));

    /** Mots de la question rapprochés du vocabulaire des réponses (abréviations courantes, synonymes). */
    private static final Map<String, String> SYNONYMS = Map.ofEntries(
            Map.entry("mdp", "mot passe"), Map.entry("password", "mot passe"), Map.entry("oublie", "oublie mot passe"),
            Map.entry("inscrire", "inscription inscrire"), Map.entry("attestation", "attestation certificat"),
            Map.entry("diplome", "certificat"), Map.entry("payer", "payante"), Map.entry("prix", "payante"),
            Map.entry("gratuit", "payante"), Map.entry("cout", "payante"), Map.entry("portable", "telephone"),
            Map.entry("smartphone", "telephone"), Map.entry("distance", "ligne"), Map.entry("presentiel", "salle"),
            Map.entry("employeur", "employeur verifier"), Map.entry("enseigner", "formateur"), Map.entry("eleve", "apprenant"),
            Map.entry("etudiant", "apprenant"), Map.entry("stagiaire", "apprenant"), Map.entry("note", "note resultat"),
            Map.entry("cours", "cours formation"), Map.entry("test", "examen"), Map.entry("evaluation", "examen"));

    /** Une réponse possible : fiche d'aide (profils ciblés) ou question de la FAQ (tous profils). */
    private record Entry(String title, Set<String> profiles, Set<String> keys, Set<String> body, String answer, boolean faq) {
    }

    private record Fiche(String title, Set<String> profiles, String keywords, String answer) {
    }

    private List<Fiche> fiches;

    /** Fiches d'aide par profil (resources/assistant/fiches.md), lues une fois. */
    private List<Fiche> fiches() {
        if (fiches != null) return fiches;
        List<Fiche> out = new ArrayList<>();
        try (InputStream in = new ClassPathResource("assistant/fiches.md").getInputStream()) {
            String title = null, keywords = "";
            Set<String> profiles = Set.of();
            StringBuilder body = new StringBuilder();
            for (String line : (new String(in.readAllBytes(), StandardCharsets.UTF_8) + "\n## ").split("\n")) {
                if (line.startsWith("## ")) {
                    if (title != null) out.add(new Fiche(title, profiles, keywords, body.toString().strip()));
                    title = line.substring(3).strip();
                    profiles = Set.of();
                    keywords = "";
                    body.setLength(0);
                } else if (title == null) {
                    continue; // en-tête explicatif du fichier
                } else if (line.startsWith("pour :")) {
                    profiles = Arrays.stream(line.substring(6).split(",")).map(String::strip).collect(Collectors.toSet());
                } else if (line.startsWith("mots :")) {
                    keywords = line.substring(6);
                } else {
                    body.append(line).append('\n');
                }
            }
        } catch (IOException e) {
            throw new IllegalStateException("Fiches d'aide de l'assistant introuvables", e);
        }
        fiches = List.copyOf(out);
        return fiches;
    }

    private static final Map<String, String> RESERVED = Map.of(
            "formateur", "Cette fonction se trouve dans l'espace formateur, réservé aux formateurs de l'Académie.",
            "admin", "Cette fonction est réservée à l'administration de l'Académie.",
            "apprenant", "Cette fonction se trouve dans l'espace apprenant, une fois connecté avec un compte apprenant.");

    /**
     * Réponse sans IA. Les fiches du profil connecté passent devant les autres ; une fiche d'un autre profil n'est
     * proposée qu'avec une mention claire (« réservée aux formateurs »…), et la question doit vraiment correspondre.
     */
    String fromFaq(String question, User user) {
        String profile = profile(user);
        Set<String> asked = words(question);
        Set<String> expanded = new HashSet<>(asked);
        asked.forEach(w -> { String syn = SYNONYMS.get(w); if (syn != null) expanded.addAll(words(syn)); });

        List<Entry> entries = new ArrayList<>();
        for (Fiche f : fiches()) {
            Set<String> keys = words(f.keywords());
            keys.addAll(words(f.title()));
            entries.add(new Entry(f.title(), f.profiles(), keys, words(f.answer()), f.answer(), false));
        }
        for (FaqDto f : content.faq()) {
            entries.add(new Entry(f.q(), Set.of(), words(f.q()), words(f.a()), f.a(), true));
        }

        Entry best = null;
        double bestScore = 0;
        for (Entry e : entries) {
            double score = 0;
            int covered = 0;
            for (String w : expanded) {
                if (e.keys().contains(w)) score += 2;
                else if (e.body().contains(w)) score += 0.5;
            }
            for (String w : asked) {
                String syn = SYNONYMS.get(w);
                boolean hit = e.keys().contains(w) || e.body().contains(w)
                        || (syn != null && words(syn).stream().anyMatch(s -> e.keys().contains(s)));
                if (hit) covered++;
            }
            // La question doit être couverte au moins pour moitié par la réponse
            if (asked.isEmpty() || covered * 2 < asked.size()) continue;
            // Le profil départage des réponses proches, sans l'emporter sur une réponse qui correspond nettement mieux
            // (« suivre mes apprenants » posé par un apprenant : la fiche formateur, avec sa mise en garde)
            boolean forMe = e.faq() ? "visiteur".equals(profile) : e.profiles().contains(profile);
            score *= e.faq() ? (forMe ? 1.0 : 0.9) : (forMe ? 1.25 : 0.8);
            if (score > bestScore) {
                bestScore = score;
                best = e;
            }
        }

        if (best != null && bestScore >= 2) {
            StringBuilder reply = new StringBuilder();
            if (!best.faq() && !best.profiles().contains(profile)) {
                String target = best.profiles().contains("formateur") ? "formateur"
                        : best.profiles().contains("admin") ? "admin" : "apprenant";
                // Un visiteur qui veut devenir apprenant n'a besoin d'aucune mise en garde
                if (!("visiteur".equals(profile) && best.profiles().contains("visiteur"))) {
                    reply.append(RESERVED.get(target)).append("\n\n");
                }
            }
            reply.append("**").append(best.title()).append("**\n\n").append(best.answer());
            if (best.faq()) reply.append("\n\nD'autres réponses dans les [questions fréquentes](/faq).");
            return reply.toString();
        }
        Map<String, String> s = settings.all();
        String phone = s.get("contact.phone");
        return "Je n'ai pas trouvé de réponse précise à votre question. Reformulez-la avec d'autres mots, ou :\n\n"
                + "- parcourez les [questions fréquentes](/faq) ;\n"
                + "- écrivez à l'Académie depuis la [page Contact](/contact)"
                + (phone == null || phone.isBlank() ? "" : " ou appelez-la au " + phone) + ".";
    }

    private static Set<String> words(String text) {
        String plain = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
        Set<String> out = new HashSet<>();
        for (String w : plain.split("[^a-z0-9]+")) {
            if (w.length() < 2 || STOP.contains(w)) continue;
            // Pluriels et formes simples : « formations » et « formation » se rejoignent
            out.add(w.length() > 4 && w.endsWith("s") ? w.substring(0, w.length() - 1) : w);
        }
        return out;
    }
}
