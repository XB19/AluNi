package tg.cdej.aluni.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.Submission;
import tg.cdej.aluni.domain.User;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    List<Submission> findByCourseInOrderBySubmittedAtDesc(List<Course> courses);

    List<Submission> findByUserOrderBySubmittedAtDesc(User user);
}
