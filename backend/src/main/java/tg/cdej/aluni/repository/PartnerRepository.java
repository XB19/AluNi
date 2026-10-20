package tg.cdej.aluni.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.Partner;

public interface PartnerRepository extends JpaRepository<Partner, Long> {

    List<Partner> findAllByOrderByPositionAscIdAsc();
}
