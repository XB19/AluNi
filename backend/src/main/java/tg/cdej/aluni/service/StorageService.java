package tg.cdej.aluni.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.config.AppProperties;

/**
 * Stockage des fichiers sur le disque du serveur.
 * <ul>
 * <li>public/ : supports de cours, images, photos (servis sous /files/…)</li>
 * <li>private/ : exercices déposés par les apprenants (accès contrôlé)</li>
 * </ul>
 */
@Service
public class StorageService {

    public static final Set<String> IMAGES = Set.of("jpg", "jpeg", "png", "webp", "gif");
    /**
     * Supports de cours publics. Pas de .html, .js ni .svg : servis sur le même domaine que le site,
     * ils pourraient exécuter du code dans le navigateur des utilisateurs.
     */
    public static final Set<String> DOCUMENTS = Set.of("jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx",
            "xls", "xlsx", "ppt", "pptx", "txt", "zip", "mp4", "webm", "mp3");

    /** Exercices déposés par les apprenants : privés et toujours téléchargés (jamais affichés), le code source est permis. */
    public static final Set<String> SUBMISSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx",
            "xls", "xlsx", "ppt", "pptx", "txt", "zip", "html", "css", "js", "py", "mp4", "webm", "mp3");

    private final Path root;

    public StorageService(AppProperties props) throws IOException {
        this.root = Path.of(props.storageDir()).toAbsolutePath().normalize();
        Files.createDirectories(root.resolve("public"));
        Files.createDirectories(root.resolve("private"));
    }

    public Path publicRoot() {
        return root.resolve("public");
    }

    public static String extension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    /** Enregistre un fichier public et renvoie son URL (/files/dossier/nom). */
    public String storePublic(MultipartFile file, String folder, Set<String> allowed) {
        return "/files/" + store(file, "public", folder, allowed);
    }

    /** Enregistre un fichier privé et renvoie son chemin relatif. */
    public String storePrivate(MultipartFile file, String folder, Set<String> allowed) {
        return store(file, "private", folder, allowed);
    }

    private String store(MultipartFile file, String visibility, String folder, Set<String> allowed) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Aucun fichier reçu.");
        String ext = extension(file.getOriginalFilename());
        if (!allowed.contains(ext)) throw ApiException.badRequest("Type de fichier non autorisé (." + ext + ").");
        String relative = folder + "/" + UUID.randomUUID() + "." + ext;
        Path target = root.resolve(visibility).resolve(relative).normalize();
        if (!target.startsWith(root)) throw ApiException.badRequest("Nom de fichier invalide.");
        try (InputStream in = file.getInputStream()) {
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible d'enregistrer le fichier", e);
        }
        return relative;
    }

    /** Enregistre des octets (ex. image extraite d'un document) et renvoie leur URL publique. */
    public String storePublicBytes(byte[] data, String folder, String extension) {
        String ext = extension == null ? "bin" : extension.replace(".", "").toLowerCase(Locale.ROOT);
        String relative = folder + "/" + UUID.randomUUID() + "." + ext;
        Path target = root.resolve("public").resolve(relative).normalize();
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, data);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible d'enregistrer le fichier", e);
        }
        return "/files/" + relative;
    }

    public Resource loadPrivate(String relative) {
        Path path = root.resolve("private").resolve(relative).normalize();
        if (!path.startsWith(root) || !Files.exists(path)) throw ApiException.notFound("Fichier introuvable.");
        return new PathResource(path);
    }
}
