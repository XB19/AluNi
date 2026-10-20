package tg.cdej.aluni.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.common.Codes;
import tg.cdej.aluni.domain.ProfileType;
import tg.cdej.aluni.domain.Question;
import tg.cdej.aluni.domain.QuestionType;

class UnitTests {

    @Test
    void phonesAreNormalizedToEightDigits() {
        assertThat(Texts.normalize("+228 90 11 22 33")).isEqualTo("90112233");
        assertThat(Texts.normalize("00228-90112233")).isEqualTo("90112233");
        assertThat(Texts.normalize("  ")).isNull();
        assertThatThrownBy(() -> Texts.normalize("123")).isInstanceOf(ApiException.class);
        assertThat(Texts.display("90112233")).isEqualTo("90 11 22 33");
    }

    @Test
    void slugsAreReadable() {
        assertThat(Texts.slugify("Créer son premier site web (HTML & CSS)")).isEqualTo("creer-son-premier-site-web-html-css");
    }

    @Test
    void codesRoundTrip() {
        assertThat(Codes.of(ProfileType.AUTRE_CDEJ)).isEqualTo("autre-cdej");
        assertThat(Codes.parse(ProfileType.class, "autre-cdej")).isEqualTo(ProfileType.AUTRE_CDEJ);
        assertThatThrownBy(() -> Codes.parse(ProfileType.class, "inconnu")).isInstanceOf(ApiException.class);
    }

    @Test
    void mentionsFollowTheScale() {
        assertThat(CertificateService.mention(95)).isEqualTo("Excellent");
        assertThat(CertificateService.mention(80)).isEqualTo("Très bien");
        assertThat(CertificateService.mention(60)).isEqualTo("Assez bien");
        assertThat(CertificateService.mention(null)).isNull();
    }

    private static Question question(QuestionType type, List<Integer> correct, List<String> accepted) {
        Question q = new Question();
        q.setType(type);
        q.setCorrectAnswers(correct);
        q.setAcceptedAnswers(accepted);
        return q;
    }

    @Test
    void multipleChoiceRequiresTheExactSet() {
        Question q = question(QuestionType.MULTIPLE, List.of(0, 2, 3), List.of());
        assertThat(ExamService.isCorrect(q, List.of(3, 0, 2))).isTrue();
        assertThat(ExamService.isCorrect(q, List.of(0, 2))).isFalse();
        assertThat(ExamService.isCorrect(q, null)).isFalse();
    }

    @Test
    void shortAnswersIgnoreCaseAndAccents() {
        Question q = question(QuestionType.COURTE, List.of(), List.of("navigateur", "navigateur web"));
        assertThat(ExamService.isCorrect(q, "  Navigateur  Web ")).isTrue();
        assertThat(ExamService.isCorrect(q, "NAVIGATEUR")).isTrue();
        assertThat(ExamService.isCorrect(q, "souris")).isFalse();
        assertThat(ExamService.isCorrect(q, "")).isFalse();
    }
}
