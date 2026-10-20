package tg.cdej.aluni.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.ContactMessage;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {

    List<ContactMessage> findAllByOrderByCreatedAtDesc();
}
