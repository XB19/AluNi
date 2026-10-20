package tg.cdej.aluni.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "aluni")
public record AppProperties(
        String frontendUrl,
        List<String> corsOrigins,
        String jwtSecret,
        int jwtExpirationHours,
        String certificateSecret,
        String storageDir,
        boolean seedDemoData,
        String demoPassword,
        List<String> examRoomIpPrefixes) {

    public AppProperties {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException("aluni.jwt-secret (JWT_SECRET) doit contenir au moins 32 caractères");
        }
        if (certificateSecret == null || certificateSecret.isBlank()) {
            throw new IllegalStateException("aluni.certificate-secret (CERT_SECRET) est obligatoire");
        }
    }
}
