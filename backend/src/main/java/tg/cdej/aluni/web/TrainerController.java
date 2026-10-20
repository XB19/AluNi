package tg.cdej.aluni.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
import tg.cdej.aluni.dto.CourseDtos.CourseEdit;
import tg.cdej.aluni.dto.CourseDtos.TrainerCourseDto;
import tg.cdej.aluni.dto.ExamDtos.ExamSettings;
import tg.cdej.aluni.dto.ImportDtos.CourseImportPreview;
import tg.cdej.aluni.dto.ImportDtos.QuestionImportResult;
import tg.cdej.aluni.dto.LearningDtos.FileDto;
import tg.cdej.aluni.dto.LearningDtos.GradeRequest;
import tg.cdej.aluni.dto.LearningDtos.SubmissionDto;
import tg.cdej.aluni.dto.TrainerDtos.QuestionDto;
import tg.cdej.aluni.dto.TrainerDtos.QuestionRequest;
import tg.cdej.aluni.dto.TrainerDtos.TrainerDashboard;
import tg.cdej.aluni.dto.TrainerDtos.TrainerLearnerDto;
import tg.cdej.aluni.security.CurrentUser;
import tg.cdej.aluni.service.StorageService;
import tg.cdej.aluni.service.TrainerService;
import tg.cdej.aluni.service.importer.CourseImportService;
import tg.cdej.aluni.service.importer.ImportTemplates;
import tg.cdej.aluni.service.importer.QuestionImportService;

/** Espace formateur (accessible aussi à l'administrateur). */
@RestController
@RequestMapping("/api/trainer")
public class TrainerController {

    private final TrainerService trainer;
    private final StorageService storage;
    private final CurrentUser current;
    private final CourseImportService courseImport;
    private final QuestionImportService questionImport;
    private final ImportTemplates templates;

    public TrainerController(TrainerService trainer, StorageService storage, CurrentUser current,
            CourseImportService courseImport, QuestionImportService questionImport, ImportTemplates templates) {
        this.trainer = trainer;
        this.storage = storage;
        this.current = current;
        this.courseImport = courseImport;
        this.questionImport = questionImport;
        this.templates = templates;
    }

    @GetMapping("/dashboard")
    public TrainerDashboard dashboard() {
        return trainer.dashboard(current.get());
    }

    @GetMapping("/courses")
    public List<TrainerCourseDto> courses() {
        return trainer.courses(current.get());
    }

    @PostMapping("/courses")
    @ResponseStatus(HttpStatus.CREATED)
    public CourseEdit create(@Valid @RequestBody CourseEdit body) {
        return trainer.create(current.get(), body);
    }

    @GetMapping("/courses/{id}")
    public CourseEdit get(@PathVariable Long id) {
        return trainer.get(current.get(), id);
    }

    @PutMapping("/courses/{id}")
    public CourseEdit update(@PathVariable Long id, @Valid @RequestBody CourseEdit body) {
        return trainer.update(current.get(), id, body);
    }

    @PostMapping("/courses/{id}/submit")
    public CourseEdit submit(@PathVariable Long id) {
        return trainer.submit(current.get(), id);
    }

    @GetMapping("/courses/{id}/exam")
    public ExamSettings exam(@PathVariable Long id) {
        return trainer.examSettings(current.get(), id);
    }

    @PutMapping("/courses/{id}/exam")
    public ExamSettings saveExam(@PathVariable Long id, @Valid @RequestBody ExamSettings body) {
        return trainer.saveExam(current.get(), id, body);
    }

    @GetMapping("/questions")
    public List<QuestionDto> questions(@RequestParam(required = false) String course,
            @RequestParam(required = false) String type, @RequestParam(required = false) String q) {
        return trainer.questions(current.get(), course, type, q);
    }

    @PostMapping("/questions")
    @ResponseStatus(HttpStatus.CREATED)
    public QuestionDto createQuestion(@Valid @RequestBody QuestionRequest body) {
        return trainer.saveQuestion(current.get(), null, body);
    }

    @PutMapping("/questions/{id}")
    public QuestionDto updateQuestion(@PathVariable Long id, @Valid @RequestBody QuestionRequest body) {
        return trainer.saveQuestion(current.get(), id, body);
    }

    @DeleteMapping("/questions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteQuestion(@PathVariable Long id) {
        trainer.deleteQuestion(current.get(), id);
    }

    @GetMapping("/learners")
    public List<TrainerLearnerDto> learners(@RequestParam(required = false) String course) {
        return trainer.learners(current.get(), course);
    }

    @GetMapping("/submissions")
    public List<SubmissionDto> submissions() {
        return trainer.submissions(current.get());
    }

    @PostMapping("/submissions/{id}/grade")
    public SubmissionDto grade(@PathVariable Long id, @Valid @RequestBody GradeRequest body) {
        return trainer.grade(current.get(), id, body);
    }

    // ----- Import de documents

    /** Transforme un document Word, PowerPoint, PDF ou texte en modules et leçons (aperçu, rien n'est enregistré). */
    @PostMapping(path = "/import/course", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CourseImportPreview importCourse(@RequestParam("file") MultipartFile file) {
        current.get();
        return courseImport.preview(file);
    }

    /** Reconnaît les questions d'un document ; avec dryRun=false, les crée (et les ajoute à l'examen si demandé). */
    @PostMapping(path = "/import/questions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public QuestionImportResult importQuestions(@RequestParam("file") MultipartFile file, @RequestParam Long courseId,
            @RequestParam(required = false) Long moduleId, @RequestParam(defaultValue = "true") boolean dryRun,
            @RequestParam(defaultValue = "false") boolean addToExam) {
        return questionImport.importFile(current.get(), courseId, moduleId, file, dryRun, addToExam);
    }

    @GetMapping("/import/templates/{kind}")
    public ResponseEntity<byte[]> template(@PathVariable String kind) {
        MediaType docx = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        return switch (kind) {
            case "cours" -> Downloads.file(templates.course(), "modele-cours-aluni.docx", docx, false);
            case "questions" -> Downloads.file(templates.questions(), "modele-questions-aluni.docx", docx, false);
            default -> ResponseEntity.notFound().build();
        };
    }

    /** Dépôt d'un support de cours (PDF, image, vidéo…) ou d'une image de couverture. */
    @PostMapping(path = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileDto upload(@RequestParam("file") MultipartFile file) {
        current.get();
        String url = storage.storePublic(file, "cours", StorageService.DOCUMENTS);
        return new FileDto(url, file.getOriginalFilename(), file.getSize(), file.getContentType());
    }
}
