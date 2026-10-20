package tg.cdej.aluni.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.SiteSetting;

public interface SiteSettingRepository extends JpaRepository<SiteSetting, String> {
}
