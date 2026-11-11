package tg.cdej.aluni.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Exam;
import tg.cdej.aluni.domain.ExamSession;

public interface ExamSessionRepository extends JpaRepository<ExamSession, Long> {

    List<ExamSession> findByExamOrderByStartsAtAsc(Exam exam);
}
