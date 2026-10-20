package tg.cdej.aluni.service;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.domain.AccountStatus;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.CourseStatus;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.dto.CourseDtos.CategoryDto;
import tg.cdej.aluni.dto.CourseDtos.CourseDetail;
import tg.cdej.aluni.dto.CourseDtos.CourseSummary;
import tg.cdej.aluni.dto.CourseDtos.TrainerDto;
import tg.cdej.aluni.repository.CategoryRepository;
import tg.cdej.aluni.repository.CourseRepository;
import tg.cdej.aluni.repository.ExamRepository;
import tg.cdej.aluni.repository.UserRepository;

@Service
public class CatalogService {

    private final CategoryRepository categories;
    private final CourseRepository courses;
    private final ExamRepository exams;
    private final UserRepository users;
    private final Mapper mapper;

    public CatalogService(CategoryRepository categories, CourseRepository courses, ExamRepository exams,
            UserRepository users, Mapper mapper) {
        this.categories = categories;
        this.courses = courses;
        this.exams = exams;
        this.users = users;
        this.mapper = mapper;
    }

    private static String fold(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> categories() {
        Map<Long, Long> counts = courses.findByStatusOrderByCreatedAtAsc(CourseStatus.PUBLIEE).stream()
                .collect(Collectors.groupingBy(c -> c.getCategory().getId(), Collectors.counting()));
        return categories.findAllByOrderByPositionAsc().stream()
                .map(c -> mapper.category(c, counts.getOrDefault(c.getId(), 0L))).toList();
    }

    /** Catalogue public : formations publiées, avec recherche plein texte et tri. */
    @Transactional(readOnly = true)
    public List<CourseSummary> search(String q, String sort) {
        String term = fold(q).trim();
        Stream<Course> stream = courses.findByStatusOrderByCreatedAtAsc(CourseStatus.PUBLIEE).stream();
        if (!term.isEmpty()) {
            stream = stream.filter(c -> fold(String.join(" ", c.getTitle(), String.valueOf(c.getShortDescription()),
                    String.join(" ", c.getSkills()), c.getCategory().getName())).contains(term));
        }
        List<CourseSummary> list = stream.map(mapper::summary).collect(Collectors.toList());
        Comparator<CourseSummary> order = switch (sort == null ? "popular" : sort) {
            case "rating" -> Comparator.comparingDouble(CourseSummary::rating).reversed();
            case "short" -> Comparator.comparingInt(CourseSummary::hours);
            case "recent" -> Comparator.comparing(CourseSummary::id, Comparator.reverseOrder());
            default -> Comparator.comparing(CourseSummary::popular).reversed()
                    .thenComparing(Comparator.comparingLong(CourseSummary::learners).reversed());
        };
        list.sort(order);
        return list;
    }

    @Transactional(readOnly = true)
    public CourseDetail detail(String slug) {
        Course c = courses.findBySlug(slug).filter(x -> x.getStatus() == CourseStatus.PUBLIEE)
                .orElseThrow(() -> ApiException.notFound("Formation introuvable."));
        return mapper.detail(c, exams.findByCourse(c).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<TrainerDto> trainers() {
        return users.findByRoleAndStatusOrderByCreatedAtAsc(Role.FORMATEUR, AccountStatus.ACTIF).stream()
                .map(mapper::trainer).filter(t -> t.courses() > 0).toList();
    }
}
