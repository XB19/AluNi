package tg.cdej.aluni.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.domain.User;
import tg.cdej.aluni.dto.AssistantDtos.AssistantStatus;
import tg.cdej.aluni.dto.AssistantDtos.ChatReply;
import tg.cdej.aluni.dto.AssistantDtos.ChatRequest;
import tg.cdej.aluni.security.CurrentUser;
import tg.cdej.aluni.service.AssistantService;

/** Assistant de la plateforme, ouvert à tous (visiteurs et personnes connectées). */
@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    private final AssistantService assistant;
    private final CurrentUser current;

    public AssistantController(AssistantService assistant, CurrentUser current) {
        this.assistant = assistant;
        this.current = current;
    }

    @GetMapping("/status")
    public AssistantStatus status() {
        return new AssistantStatus(assistant.aiEnabled());
    }

    @PostMapping("/chat")
    public ChatReply chat(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        User user = null;
        try {
            user = current.get();
        } catch (ApiException notConnected) {
            // Visiteur : l'assistant répond aussi
        }
        String visitor = user != null ? "u" + user.getId() : "ip" + http.getRemoteAddr();
        return assistant.chat(request.messages(), user, visitor);
    }
}
