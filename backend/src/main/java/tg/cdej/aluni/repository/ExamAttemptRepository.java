package tg.cdej.aluni.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.AttemptStatus;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.Exam;
import tg.cdej.aluni.domain.ExamAttempt;
import tg.cdej.aluni.domain.User;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    List<ExamAttempt> findByExamAndUserOrderByNumberAsc(Exam exam, User user);

    Optional<ExamAttempt> findFirstByExamAndUserAndStatus(Exam exam, User user, AttemptStatus status);

    List<ExamAttempt> findByStatusAndEndsAtBefore(AttemptStatus status, Instant limit);

    List<ExamAttempt> findByStatus(AttemptStatus status);

    List<ExamAttempt> findByExam_CourseIn(List<Course> courses);

    List<ExamAttempt> findByUser(User user);
}
