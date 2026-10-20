package tg.cdej.aluni.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.PasswordResetCode;
import tg.cdej.aluni.domain.User;

public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {

    Optional<PasswordResetCode> findFirstByUserAndUsedFalseOrderByCreatedAtDesc(User user);
}
