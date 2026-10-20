package tg.cdej.aluni.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.CourseModule;
import tg.cdej.aluni.domain.QuizResult;
import tg.cdej.aluni.domain.User;

public interface QuizResultRepository extends JpaRepository<QuizResult, Long> {

    Optional<QuizResult> findByUserAndModule(User user, CourseModule module);

    List<QuizResult> findByUserAndModule_Course(User user, Course course);
}
