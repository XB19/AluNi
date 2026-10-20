package tg.cdej.aluni.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import tg.cdej.aluni.domain.Notification;
import tg.cdej.aluni.domain.User;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop50ByUserOrderByCreatedAtDesc(User user);

    long countByUserAndReadFalse(User user);

    @Modifying
    @Query("update Notification n set n.read = true where n.user = :user and n.read = false")
    int markAllRead(@Param("user") User user);
}
