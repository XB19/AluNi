package tg.cdej.aluni.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.News;

public interface NewsRepository extends JpaRepository<News, Long> {

    List<News> findByPublishedTrueOrderByPublishedAtDesc();

    List<News> findAllByOrderByPublishedAtDesc();

    Optional<News> findBySlugAndPublishedTrue(String slug);

    boolean existsBySlug(String slug);
}
