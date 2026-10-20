package tg.cdej.aluni.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Soumet chaque minute les examens abandonnés dont le temps est écoulé. */
@Component
public class ExamCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(ExamCleanupJob.class);

    private final ExamService exams;

    public ExamCleanupJob(ExamService exams) {
        this.exams = exams;
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void run() {
        int count = exams.finalizeExpired();
        if (count > 0) log.info("{} examen(s) soumis automatiquement (temps écoulé)", count);
    }
}
