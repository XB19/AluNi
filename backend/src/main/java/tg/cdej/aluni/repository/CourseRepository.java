package tg.cdej.aluni.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Category;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.CourseStatus;
import tg.cdej.aluni.domain.User;

public interface CourseRepository extends JpaRepository<Course, Long> {

    Optional<Course> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Course> findByStatusOrderByCreatedAtAsc(CourseStatus status);

    List<Course> findByTrainerOrderByCreatedAtAsc(User trainer);

    long countByStatus(CourseStatus status);

    long countByCategory(Category category);
}
