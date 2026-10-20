package tg.cdej.aluni.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.CourseModule;

public interface CourseModuleRepository extends JpaRepository<CourseModule, Long> {
}
