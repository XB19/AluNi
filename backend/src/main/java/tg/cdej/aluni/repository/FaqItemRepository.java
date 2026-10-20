package tg.cdej.aluni.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.FaqItem;

public interface FaqItemRepository extends JpaRepository<FaqItem, Long> {

    List<FaqItem> findAllByOrderByPositionAscIdAsc();
}
