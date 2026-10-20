package tg.cdej.aluni.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.CourseModule;
import tg.cdej.aluni.domain.Question;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findByModuleOrderByIdAsc(CourseModule module);

    List<Question> findByCourseAndModuleIsNullOrderByIdAsc(Course course);

    List<Question> findByCourseInOrderByCreatedAtDesc(List<Course> courses);
}
