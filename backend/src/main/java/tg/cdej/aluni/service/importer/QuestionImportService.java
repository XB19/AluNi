package tg.cdej.aluni.service.importer;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.Exam;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.ImportDtos.ParsedQuestion;
import tg.cdej.aluni.dto.ImportDtos.QuestionImportResult;
import tg.cdej.aluni.dto.TrainerDtos.QuestionDto;
import tg.cdej.aluni.dto.TrainerDtos.QuestionRequest;
import tg.cdej.aluni.repository.ExamRepository;
import tg.cdej.aluni.repository.QuestionRepository;
import tg.cdej.aluni.service.TrainerService;

/** Crée des questions à partir d'un document Word, PDF ou texte. */
@Service
public class QuestionImportService {

    private final DocumentExtractor extractor;
    private final TrainerService trainer;
    private final ExamRepository exams;
    private final QuestionRepository questions;

    public QuestionImportService(DocumentExtractor extractor, TrainerService trainer, ExamRepository exams,
            QuestionRepository questions) {
        this.extractor = extractor;
        this.trainer = trainer;
        this.exams = exams;
        this.questions = questions;
    }

    /**
     * @param dryRun    true : analyse seulement (aperçu)
     * @param addToExam ajoute les questions créées à l'examen final de la formation
     */
    @Transactional
    public QuestionImportResult importFile(User user, Long courseId, Long moduleId, MultipartFile file, boolean dryRun,
            boolean addToExam) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Aucun fichier reçu.");
        Course course = trainer.ownedCourse(user, courseId);
        List<ParsedQuestion> parsed;
        try {
            parsed = QuestionParser.parse(extractor.lines(file.getOriginalFilename(), file.getInputStream()), moduleId != null);
        } catch (IOException e) {
            throw ApiException.badRequest("Impossible de lire le fichier.");
        }
        if (parsed.isEmpty()) {
            throw ApiException.badRequest("Aucune question reconnue. Numérotez vos questions (1., 2., …) et indiquez les réponses sous chacune (a), b), c)…). Téléchargez le modèle pour un exemple.");
        }

        List<ParsedQuestion> result = new ArrayList<>(parsed);
        int created = 0;
        boolean added = false;
        if (!dryRun) {
            List<Long> ids = new ArrayList<>();
            for (int i = 0; i < result.size(); i++) {
                ParsedQuestion q = result.get(i);
                if (q.error() != null) continue;
                try {
                    QuestionDto dto = trainer.saveQuestion(user, null, new QuestionRequest(course.getId(), moduleId, q.type(), q.text(),
                            q.options(), q.correct(), q.accepted(), Math.min(q.points(), 20)));
                    ids.add(dto.id());
                    created++;
                } catch (ApiException e) {
                    result.set(i, new ParsedQuestion(q.line(), q.type(), q.text(), q.options(), q.correct(), q.accepted(), q.points(), e.getMessage()));
                }
            }
            if (addToExam && moduleId == null && !ids.isEmpty()) {
                Exam exam = exams.findByCourse(course).orElseGet(() -> {
                    Exam e = new Exam();
                    e.setCourse(course);
                    e.setTitle("Examen final – " + course.getTitle());
                    e.setQuestionCount(0);
                    return e;
                });
                questions.findAllById(ids).stream().filter(q -> q.getType() != tg.cdej.aluni.domain.QuestionType.PRATIQUE)
                        .forEach(exam.getQuestions()::add);
                if (exam.getQuestionCount() == 0) exam.setQuestionCount(Math.min(10, exam.getQuestions().size()));
                exams.save(exam);
                added = true;
            }
        }
        int invalid = (int) result.stream().filter(q -> q.error() != null).count();
        return new QuestionImportResult(result, result.size() - invalid, invalid, created, added);
    }
}
