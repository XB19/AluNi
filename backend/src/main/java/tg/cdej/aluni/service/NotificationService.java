package tg.cdej.aluni.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.common.Codes;
import tg.cdej.aluni.domain.Notification;
import tg.cdej.aluni.domain.NotificationType;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.LearningDtos.NotificationDto;
import tg.cdej.aluni.repository.NotificationRepository;

@Service
public class NotificationService {

    private final NotificationRepository repo;

    public NotificationService(NotificationRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public void notify(User user, NotificationType type, String title, String text, String link) {
        Notification n = new Notification();
        n.setUser(user);
        n.setType(type);
        n.setTitle(title);
        n.setText(text);
        n.setLink(link);
        repo.save(n);
    }

    @Transactional
    public void notifyAll(List<User> users, NotificationType type, String title, String text, String link) {
        users.forEach(u -> notify(u, type, title, text, link));
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(User user) {
        return repo.findTop50ByUserOrderByCreatedAtDesc(user).stream().map(NotificationService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public long unread(User user) {
        return repo.countByUserAndReadFalse(user);
    }

    @Transactional
    public void markRead(User user, Long id) {
        Notification n = repo.findById(id).filter(x -> x.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> ApiException.notFound("Notification introuvable."));
        n.setRead(true);
    }

    @Transactional
    public void markAllRead(User user) {
        repo.markAllRead(user);
    }

    static NotificationDto toDto(Notification n) {
        return new NotificationDto(n.getId(), Codes.of(n.getType()), n.getTitle(), n.getText(), n.getCreatedAt(),
                n.isRead(), n.getLink());
    }
}
