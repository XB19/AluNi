package tg.cdej.aluni.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.Enrollment;
import tg.cdej.aluni.domain.EnrollmentStatus;
import tg.cdej.aluni.domain.User;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    Optional<Enrollment> findByUserAndCourse(User user, Course course);

    List<Enrollment> findByUserOrderByEnrolledAtDesc(User user);

    List<Enrollment> findByCourseIn(List<Course> courses);

    List<Enrollment> findByStatusOrderByEnrolledAtAsc(EnrollmentStatus status);

    long countByCourseAndStatus(Course course, EnrollmentStatus status);
}
