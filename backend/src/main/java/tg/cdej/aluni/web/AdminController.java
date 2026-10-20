package tg.cdej.aluni.web;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.dto.AdminDtos.AdminDashboard;
import tg.cdej.aluni.dto.AdminDtos.DecisionRequest;
import tg.cdej.aluni.dto.AdminDtos.ImportResult;
import tg.cdej.aluni.dto.AdminDtos.Report;
import tg.cdej.aluni.dto.AdminDtos.Validations;
import tg.cdej.aluni.dto.CourseDtos.AdminCourseDto;
import tg.cdej.aluni.dto.CourseDtos.CategoryDto;
import tg.cdej.aluni.dto.CourseDtos.CategoryRequest;
import tg.cdej.aluni.dto.CourseDtos.CourseStatusPatch;
import tg.cdej.aluni.dto.LearningDtos.CertificateDto;
import tg.cdej.aluni.dto.LearningDtos.FileDto;
import tg.cdej.aluni.dto.LearningDtos.RevokeRequest;
import tg.cdej.aluni.dto.SiteDtos.ContactMessageDto;
import tg.cdej.aluni.dto.SiteDtos.FaqDto;
import tg.cdej.aluni.dto.SiteDtos.FaqRequest;
import tg.cdej.aluni.dto.SiteDtos.NewsDto;
import tg.cdej.aluni.dto.SiteDtos.NewsRequest;
import tg.cdej.aluni.dto.SiteDtos.PartnerDto;
import tg.cdej.aluni.dto.SiteDtos.PartnerRequest;
import tg.cdej.aluni.dto.UserDtos.AdminUserCreate;
import tg.cdej.aluni.dto.UserDtos.AdminUserDto;
import tg.cdej.aluni.dto.UserDtos.AdminUserPatch;
import tg.cdej.aluni.dto.UserDtos.CreatedAccount;
import tg.cdej.aluni.security.CurrentUser;
import tg.cdej.aluni.service.AdminService;
import tg.cdej.aluni.service.CertificateService;
import tg.cdej.aluni.service.ContentService;
import tg.cdej.aluni.service.ExcelService;
import tg.cdej.aluni.service.ReportService;
import tg.cdej.aluni.service.ReportService.Filters;
import tg.cdej.aluni.service.SettingsService;
import tg.cdej.aluni.service.StorageService;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;
    private final CertificateService certificates;
    private final ContentService content;
    private final SettingsService settings;
    private final ReportService reports;
    private final ExcelService excel;
    private final StorageService storage;
    private final CurrentUser current;

    public AdminController(AdminService admin, CertificateService certificates, ContentService content,
            SettingsService settings, ReportService reports, ExcelService excel, StorageService storage,
            CurrentUser current) {
        this.admin = admin;
        this.certificates = certificates;
        this.content = content;
        this.settings = settings;
        this.reports = reports;
        this.excel = excel;
        this.storage = storage;
        this.current = current;
    }

    @GetMapping("/dashboard")
    public AdminDashboard dashboard() {
        return admin.dashboard();
    }

    // ----- Utilisateurs

    @GetMapping("/users")
    public List<AdminUserDto> users(@RequestParam(required = false) String role, @RequestParam(required = false) String q) {
        return admin.users(role, q);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public CreatedAccount createUser(@Valid @RequestBody AdminUserCreate body) {
        return admin.createUser(body);
    }

    @PatchMapping("/users/{id}")
    public AdminUserDto patchUser(@PathVariable Long id, @RequestBody AdminUserPatch body) {
        return admin.patchUser(current.get(), id, body);
    }

    @PostMapping(path = "/users/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportResult importUsers(@RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "true") boolean dryRun) {
        return admin.importUsers(file, dryRun);
    }

    @GetMapping("/users/import-template")
    public ResponseEntity<byte[]> importTemplate() {
        return Downloads.file(excel.importTemplate(), "modele-import-apprenants.xlsx", Downloads.XLSX, false);
    }

    // ----- Validations

    @GetMapping("/validations")
    public Validations validations() {
        return admin.validations();
    }

    @PostMapping("/validations/{kind}/{id}/{decision}")
    public void decide(@PathVariable String kind, @PathVariable String id, @PathVariable String decision,
            @RequestBody(required = false) DecisionRequest body) {
        if (!decision.equals("approve") && !decision.equals("reject")) throw ApiException.badRequest("Décision invalide.");
        admin.decide(kind, id, decision.equals("approve"), body == null ? null : body.comment());
    }

    // ----- Formations et catégories

    @GetMapping("/courses")
    public List<AdminCourseDto> courses() {
        return admin.courses();
    }

    @PatchMapping("/courses/{id}")
    public void courseStatus(@PathVariable Long id, @Valid @RequestBody CourseStatusPatch body) {
        admin.setCourseStatus(id, body.status());
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@Valid @RequestBody CategoryRequest body) {
        return admin.saveCategory(null, body);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest body) {
        return admin.saveCategory(id, body);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        admin.deleteCategory(id);
    }

    // ----- Certificats

    @GetMapping("/certificates")
    public List<CertificateDto> certificates(@RequestParam(required = false) String q) {
        return certificates.all(q);
    }

    @PostMapping("/certificates/{code}/revoke")
    public CertificateDto revoke(@PathVariable String code, @Valid @RequestBody RevokeRequest body) {
        return certificates.revoke(code, body.reason());
    }

    // ----- Site vitrine

    @GetMapping("/settings")
    public Map<String, String> settings() {
        return settings.all();
    }

    @PutMapping("/settings")
    public Map<String, String> updateSettings(@RequestBody Map<String, String> body) {
        return settings.update(body);
    }

    @GetMapping("/news")
    public List<NewsDto> news() {
        return content.allNews();
    }

    @PostMapping("/news")
    @ResponseStatus(HttpStatus.CREATED)
    public NewsDto createNews(@Valid @RequestBody NewsRequest body) {
        return content.saveNews(null, body);
    }

    @PutMapping("/news/{id}")
    public NewsDto updateNews(@PathVariable Long id, @Valid @RequestBody NewsRequest body) {
        return content.saveNews(id, body);
    }

    @DeleteMapping("/news/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNews(@PathVariable Long id) {
        content.deleteNews(id);
    }

    @PostMapping("/partners")
    @ResponseStatus(HttpStatus.CREATED)
    public PartnerDto createPartner(@Valid @RequestBody PartnerRequest body) {
        return content.savePartner(null, body);
    }

    @PutMapping("/partners/{id}")
    public PartnerDto updatePartner(@PathVariable Long id, @Valid @RequestBody PartnerRequest body) {
        return content.savePartner(id, body);
    }

    @DeleteMapping("/partners/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePartner(@PathVariable Long id) {
        content.deletePartner(id);
    }

    @PostMapping("/faq")
    @ResponseStatus(HttpStatus.CREATED)
    public FaqDto createFaq(@Valid @RequestBody FaqRequest body) {
        return content.saveFaq(null, body);
    }

    @PutMapping("/faq/{id}")
    public FaqDto updateFaq(@PathVariable Long id, @Valid @RequestBody FaqRequest body) {
        return content.saveFaq(id, body);
    }

    @DeleteMapping("/faq/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFaq(@PathVariable Long id) {
        content.deleteFaq(id);
    }

    @GetMapping("/messages")
    public List<ContactMessageDto> messages() {
        return content.messages();
    }

    @PatchMapping("/messages/{id}")
    public ContactMessageDto handle(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return content.markHandled(id, body.getOrDefault("handled", true));
    }

    @PostMapping(path = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileDto upload(@RequestParam("file") MultipartFile file) {
        String url = storage.storePublic(file, "site", StorageService.IMAGES);
        return new FileDto(url, file.getOriginalFilename(), file.getSize(), file.getContentType());
    }

    // ----- Statistiques et rapports

    private static Filters filters(LocalDate from, LocalDate to, String course, String profile) {
        return new Filters(from, to, course, profile);
    }

    @GetMapping("/reports")
    public Report report(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String course, @RequestParam(required = false) String profile) {
        return reports.report(filters(from, to, course, profile));
    }

    @GetMapping("/reports/export")
    public ResponseEntity<byte[]> export(@RequestParam(defaultValue = "xlsx") String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String course, @RequestParam(required = false) String profile) {
        Filters f = filters(from, to, course, profile);
        String name = "rapport-aluni-" + LocalDate.now();
        if ("pdf".equals(format)) return Downloads.file(reports.pdf(f), name + ".pdf", MediaType.APPLICATION_PDF, false);
        return Downloads.file(reports.excel(f), name + ".xlsx", Downloads.XLSX, false);
    }
}
