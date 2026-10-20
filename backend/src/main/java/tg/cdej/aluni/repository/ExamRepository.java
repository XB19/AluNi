package tg.cdej.aluni.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.Exam;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    Optional<Exam> findByCourse(Course course);
}
