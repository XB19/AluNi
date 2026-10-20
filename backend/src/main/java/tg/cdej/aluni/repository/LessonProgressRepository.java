package tg.cdej.aluni.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.Lesson;
import tg.cdej.aluni.domain.LessonProgress;
import tg.cdej.aluni.domain.User;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

    boolean existsByUserAndLesson(User user, Lesson lesson);

    List<LessonProgress> findByUserAndLesson_Module_Course(User user, Course course);

    long countByUserAndLesson_Module_Course(User user, Course course);

    long countByUser(User user);

    void deleteByUserAndLesson(User user, Lesson lesson);
}
