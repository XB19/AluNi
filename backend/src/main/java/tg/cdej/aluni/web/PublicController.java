package tg.cdej.aluni.web;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import tg.cdej.aluni.dto.CourseDtos.CategoryDto;
import tg.cdej.aluni.dto.CourseDtos.CourseDetail;
import tg.cdej.aluni.dto.CourseDtos.CourseSummary;
import tg.cdej.aluni.dto.CourseDtos.TrainerDto;
import tg.cdej.aluni.dto.LearningDtos.CertificateDto;
import tg.cdej.aluni.dto.SiteDtos.ContactRequest;
import tg.cdej.aluni.dto.SiteDtos.FaqDto;
import tg.cdej.aluni.dto.SiteDtos.NewsDto;
import tg.cdej.aluni.dto.SiteDtos.PartnerDto;
import tg.cdej.aluni.service.CatalogService;
import tg.cdej.aluni.service.CertificateService;
import tg.cdej.aluni.service.ContentService;
import tg.cdej.aluni.service.SettingsService;

/** Données publiques du site vitrine (sans connexion). */
@RestController
@RequestMapping("/api")
public class PublicController {

    private final CatalogService catalog;
    private final ContentService content;
    private final SettingsService settings;
    private final CertificateService certificates;

    public PublicController(CatalogService catalog, ContentService content, SettingsService settings,
            CertificateService certificates) {
        this.catalog = catalog;
        this.content = content;
        this.settings = settings;
        this.certificates = certificates;
    }

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalog.categories();
    }

    @GetMapping("/courses")
    public List<CourseSummary> courses(@RequestParam(required = false) String q,
            @RequestParam(required = false) String sort) {
        return catalog.search(q, sort);
    }

    @GetMapping("/courses/{slug}")
    public CourseDetail course(@PathVariable String slug) {
        return catalog.detail(slug);
    }

    @GetMapping("/trainers")
    public List<TrainerDto> trainers() {
        return catalog.trainers();
    }

    @GetMapping("/news")
    public List<NewsDto> news() {
        return content.publishedNews();
    }

    @GetMapping("/news/{slug}")
    public NewsDto newsItem(@PathVariable String slug) {
        return content.newsBySlug(slug);
    }

    @GetMapping("/partners")
    public List<PartnerDto> partners() {
        return content.partners();
    }

    @GetMapping("/faq")
    public List<FaqDto> faq() {
        return content.faq();
    }

    @GetMapping("/site/settings")
    public Map<String, String> settings() {
        return settings.all();
    }

    @GetMapping("/certificates/verify/{code}")
    public CertificateDto verify(@PathVariable String code) {
        return certificates.verify(code);
    }

    @PostMapping("/contact")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> contact(@Valid @RequestBody ContactRequest request) {
        content.contact(request);
        return Map.of("message", "Message envoyé. Merci, nous vous répondrons rapidement.");
    }
}
