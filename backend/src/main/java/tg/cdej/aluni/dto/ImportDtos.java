package tg.cdej.aluni.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import tg.cdej.aluni.dto.CourseDtos.ModuleEdit;

public final class ImportDtos {

    private ImportDtos() {
    }

    /** Formation reconstruite à partir d'un document, à vérifier par le formateur avant enregistrement. */
    public record CourseImportPreview(
            String title,
            @JsonProperty("short") String shortDescription,
            String format,
            String sourceUrl,
            String sourceName,
            List<ModuleEdit> modules,
            List<String> warnings,
            int lessonCount,
            int imageCount) {
    }

    /** Question reconnue dans un document (error non nul si elle ne peut pas être créée). */
    public record ParsedQuestion(int line, String type, String text, List<String> options, List<Integer> correct,
            List<String> accepted, int points, String error) {
    }

    public record QuestionImportResult(List<ParsedQuestion> questions, int valid, int invalid, int created,
            boolean addedToExam) {
    }
}
