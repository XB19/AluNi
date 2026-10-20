package tg.cdej.aluni.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import tg.cdej.aluni.domain.CertType;
import tg.cdej.aluni.domain.Certificate;
import tg.cdej.aluni.domain.CertificateStatus;
import tg.cdej.aluni.domain.Course;
import tg.cdej.aluni.domain.User;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    Optional<Certificate> findByCode(String code);

    List<Certificate> findByUserOrderByIssuedAtDesc(User user);

    Optional<Certificate> findByUserAndCourseAndType(User user, Course course, CertType type);

    List<Certificate> findAllByOrderByIssuedAtDescIdDesc();

    List<Certificate> findByStatusOrderByIssuedAtAsc(CertificateStatus status);

    long countByStatus(CertificateStatus status);

    @Query(value = "select nextval('certificate_code_seq')", nativeQuery = true)
    long nextCodeNumber();
}
