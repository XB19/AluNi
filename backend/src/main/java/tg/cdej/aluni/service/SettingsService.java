package tg.cdej.aluni.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.domain.SiteSetting;
import tg.cdej.aluni.repository.SiteSettingRepository;

/** Paramètres modifiables du site vitrine et des certificats, avec leurs valeurs par défaut. */
@Service
public class SettingsService {

    public static final Map<String, String> DEFAULTS;

    static {
        Map<String, String> d = new LinkedHashMap<>();
        d.put("academy.short", "ALuNI");
        d.put("academy.name", "Académie Lumière du Numérique et de l'Innovation");
        d.put("academy.center", "CDEJ Lumière de Kpévé");
        d.put("academy.code", "TG0157");
        d.put("academy.city", "Kpévé, Togo");
        d.put("home.heroTitle", "Apprenez le numérique. Obtenez un certificat reconnu.");
        d.put("home.heroSubtitle", "Des formations simples et pratiques en bureautique, programmation, design et plus encore. Apprenez à votre rythme, sur ordinateur ou sur téléphone, avec les formateurs de l'Académie Lumière.");
        d.put("about.mission", "Former les jeunes aux compétences numériques essentielles et certifier leurs acquis, pour les aider à réussir leurs études et leur insertion professionnelle.");
        d.put("about.vision", "Une génération de jeunes confiants, compétents et créatifs, capables de transformer leur communauté grâce au numérique.");
        d.put("about.values", "Excellence, intégrité, entraide et service. Chaque jeune a de la valeur et un potentiel à révéler.");
        d.put("stats.learners", "1 200+");
        d.put("stats.courses", "9");
        d.put("stats.certificates", "640");
        d.put("stats.computers", "30");
        d.put("contact.phone", "+228 90 00 00 00");
        d.put("contact.whatsapp", "22890000000");
        d.put("contact.email", "contact@aluni.tg");
        d.put("contact.address", "CDEJ Lumière de Kpévé, Kpévé, Togo");
        d.put("contact.hours", "Lundi – Samedi, 8h – 17h");
        d.put("contact.facebook", "");
        d.put("contact.youtube", "");
        d.put("contact.mapLat", "6.73");
        d.put("contact.mapLng", "1.10");
        d.put("certificate.template", "classique");
        d.put("certificate.signatory", "A. Sossou");
        d.put("certificate.signatoryTitle", "La Coordinatrice de l'Académie");
        DEFAULTS = Map.copyOf(d);
    }

    private final SiteSettingRepository repo;

    public SettingsService(SiteSettingRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public Map<String, String> all() {
        Map<String, String> values = new LinkedHashMap<>(DEFAULTS);
        repo.findAll().forEach(s -> values.put(s.getKey(), s.getValue()));
        return values;
    }

    @Transactional(readOnly = true)
    public String get(String key) {
        return repo.findById(key).map(SiteSetting::getValue).orElse(DEFAULTS.get(key));
    }

    @Transactional
    public Map<String, String> update(Map<String, String> changes) {
        changes.forEach((key, value) -> {
            if (!DEFAULTS.containsKey(key)) throw ApiException.badRequest("Paramètre inconnu : " + key);
            repo.save(new SiteSetting(key, value == null ? "" : value.trim()));
        });
        return all();
    }
}
