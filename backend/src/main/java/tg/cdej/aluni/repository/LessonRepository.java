package tg.cdej.aluni.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Lesson;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
}
