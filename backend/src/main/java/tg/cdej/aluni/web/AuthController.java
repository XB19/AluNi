package tg.cdej.aluni.web;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import tg.cdej.aluni.dto.UserDtos.AuthResponse;
import tg.cdej.aluni.dto.UserDtos.ForgotPasswordRequest;
import tg.cdej.aluni.dto.UserDtos.LoginRequest;
import tg.cdej.aluni.dto.UserDtos.RegisterRequest;
import tg.cdej.aluni.dto.UserDtos.RegisterResponse;
import tg.cdej.aluni.dto.UserDtos.ResetPasswordRequest;
import tg.cdej.aluni.dto.UserDtos.UserDto;
import tg.cdej.aluni.dto.UserDtos.VerifyCodeRequest;
import tg.cdej.aluni.security.CurrentUser;
import tg.cdej.aluni.service.AuthService;
import tg.cdej.aluni.service.Mapper;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final CurrentUser current;
    private final Mapper mapper;

    public AuthController(AuthService auth, CurrentUser current, Mapper mapper) {
        this.auth = auth;
        this.current = current;
        this.mapper = mapper;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        return auth.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request.identifier(), request.password());
    }

    @GetMapping("/me")
    public UserDto me() {
        return mapper.user(current.get());
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgot(@Valid @RequestBody ForgotPasswordRequest request) {
        auth.forgotPassword(request.channel(), request.identifier());
        return Map.of("message", "Si un compte correspond, un code vous a été envoyé.");
    }

    @PostMapping("/verify-code")
    public Map<String, Boolean> verify(@Valid @RequestBody VerifyCodeRequest request) {
        auth.verifyCode(request.identifier(), request.code());
        return Map.of("valid", true);
    }

    @PostMapping("/reset-password")
    public Map<String, String> reset(@Valid @RequestBody ResetPasswordRequest request) {
        auth.resetPassword(request.identifier(), request.code(), request.password());
        return Map.of("message", "Mot de passe modifié.");
    }
}
