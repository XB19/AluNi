package tg.cdej.aluni.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tg.cdej.aluni.domain.AccountStatus;
import tg.cdej.aluni.domain.Role;
import tg.cdej.aluni.domain.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhone(String phone);

    List<User> findByRoleOrderByCreatedAtDesc(Role role);

    List<User> findByRoleAndStatusOrderByCreatedAtAsc(Role role, AccountStatus status);

    long countByRole(Role role);
}
