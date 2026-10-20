package tg.cdej.aluni.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserDto(Long id, String role, String firstName, String lastName, String phone, String email,
            String profile, String center, String gender, LocalDate birthDate, String photo, String status,
            String speciality, String title, String bio) {
    }

    public record AuthResponse(String token, UserDto user) {
    }

    public record LoginRequest(
            @NotBlank(message = "Saisissez votre téléphone ou votre e-mail.") String identifier,
            @NotBlank(message = "Saisissez votre mot de passe.") String password) {
    }

    public record RegisterRequest(
            @NotBlank(message = "Choisissez votre profil.") String profile,
            @Size(max = 160) String center,
            @Size(max = 160) String speciality,
            @NotBlank(message = "Champ obligatoire") @Size(max = 80) String lastName,
            @NotBlank(message = "Champ obligatoire") @Size(max = 80) String firstName,
            @NotNull(message = "Champ obligatoire") @Past(message = "Date invalide") LocalDate birthDate,
            @NotBlank(message = "Champ obligatoire") @Pattern(regexp = "[FM]", message = "Valeur invalide") String gender,
            String phone,
            @Email(message = "Adresse e-mail invalide") String email,
            @NotBlank @Size(min = 8, message = "Au moins 8 caractères.") String password) {
    }

    public record RegisterResponse(boolean pending, String token, UserDto user, String message) {
    }

    public record ForgotPasswordRequest(@NotBlank String channel, @NotBlank String identifier) {
    }

    public record VerifyCodeRequest(@NotBlank String identifier, @NotBlank String code) {
    }

    public record ResetPasswordRequest(
            @NotBlank String identifier,
            @NotBlank String code,
            @NotBlank @Size(min = 8, message = "Au moins 8 caractères.") String password) {
    }

    public record ProfileUpdate(
            @NotBlank @Size(max = 80) String firstName,
            @NotBlank @Size(max = 80) String lastName,
            String phone,
            @Email(message = "Adresse e-mail invalide") String email,
            LocalDate birthDate,
            String gender,
            @Size(max = 160) String title,
            String bio) {
    }

    public record PasswordChange(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, message = "Au moins 8 caractères.") String newPassword) {
    }

    public record AdminUserDto(Long id, String name, String firstName, String lastName, String role, String profile,
            String center, String phone, String email, String status, LocalDate joined, String speciality) {
    }

    public record AdminUserCreate(
            @NotBlank @Size(max = 80) String firstName,
            @NotBlank @Size(max = 80) String lastName,
            String phone,
            @Email String email,
            @NotBlank String role,
            String profile,
            String center,
            String speciality,
            LocalDate birthDate,
            String gender) {
    }

    public record AdminUserPatch(String status, String role) {
    }

    public record CreatedAccount(Long id, String name, String phone, String email, String tempPassword) {
    }
}
