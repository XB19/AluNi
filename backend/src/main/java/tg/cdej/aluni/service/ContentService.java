package tg.cdej.aluni.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.domain.ContactMessage;
import tg.cdej.aluni.domain.FaqItem;
import tg.cdej.aluni.domain.News;
import tg.cdej.aluni.domain.Partner;
import tg.cdej.aluni.dto.SiteDtos.ContactMessageDto;
import tg.cdej.aluni.dto.SiteDtos.ContactRequest;
import tg.cdej.aluni.dto.SiteDtos.FaqDto;
import tg.cdej.aluni.dto.SiteDtos.FaqRequest;
import tg.cdej.aluni.dto.SiteDtos.NewsDto;
import tg.cdej.aluni.dto.SiteDtos.NewsRequest;
import tg.cdej.aluni.dto.SiteDtos.PartnerDto;
import tg.cdej.aluni.dto.SiteDtos.PartnerRequest;
import tg.cdej.aluni.repository.ContactMessageRepository;
import tg.cdej.aluni.repository.FaqItemRepository;
import tg.cdej.aluni.repository.NewsRepository;
import tg.cdej.aluni.repository.PartnerRepository;

/** Contenus du site vitrine : actualités, partenaires, FAQ et messages de contact. */
@Service
public class ContentService {

    private final NewsRepository news;
    private final PartnerRepository partners;
    private final FaqItemRepository faq;
    private final ContactMessageRepository messages;
    private final Mapper mapper;

    public ContentService(NewsRepository news, PartnerRepository partners, FaqItemRepository faq,
            ContactMessageRepository messages, Mapper mapper) {
        this.news = news;
        this.partners = partners;
        this.faq = faq;
        this.messages = messages;
        this.mapper = mapper;
    }

    // ------------------------------------------------------------ Actualités

    @Transactional(readOnly = true)
    public List<NewsDto> publishedNews() {
        return news.findByPublishedTrueOrderByPublishedAtDesc().stream().map(mapper::news).toList();
    }

    @Transactional(readOnly = true)
    public NewsDto newsBySlug(String slug) {
        return news.findBySlugAndPublishedTrue(slug).map(mapper::news)
                .orElseThrow(() -> ApiException.notFound("Actualité introuvable."));
    }

    @Transactional(readOnly = true)
    public List<NewsDto> allNews() {
        return news.findAllByOrderByPublishedAtDesc().stream().map(mapper::news).toList();
    }

    @Transactional
    public NewsDto saveNews(Long id, NewsRequest r) {
        News n = id == null ? new News() : news.findById(id).orElseThrow(() -> ApiException.notFound("Actualité introuvable."));
        if (id == null) {
            String base = Texts.slugify(r.title());
            String slug = base;
            for (int i = 2; news.existsBySlug(slug); i++) slug = base + "-" + i;
            n.setSlug(slug);
        }
        n.setTitle(r.title().trim());
        n.setCategory(r.category());
        n.setExcerpt(r.excerpt());
        n.setBody(r.body());
        n.setImageUrl(r.image());
        n.setPublishedAt(r.date() == null ? LocalDate.now() : r.date());
        n.setPublished(r.published());
        return mapper.news(news.save(n));
    }

    @Transactional
    public void deleteNews(Long id) {
        news.deleteById(id);
    }

    // ------------------------------------------------------------ Partenaires

    @Transactional(readOnly = true)
    public List<PartnerDto> partners() {
        return partners.findAllByOrderByPositionAscIdAsc().stream().map(mapper::partner).toList();
    }

    @Transactional
    public PartnerDto savePartner(Long id, PartnerRequest r) {
        Partner p = id == null ? new Partner() : partners.findById(id).orElseThrow(() -> ApiException.notFound("Partenaire introuvable."));
        if (id == null) p.setPosition((int) partners.count());
        p.setName(r.name().trim());
        p.setLogoUrl(r.logo());
        p.setWebsite(r.website());
        return mapper.partner(partners.save(p));
    }

    @Transactional
    public void deletePartner(Long id) {
        partners.deleteById(id);
    }

    // ------------------------------------------------------------ FAQ

    @Transactional(readOnly = true)
    public List<FaqDto> faq() {
        return faq.findAllByOrderByPositionAscIdAsc().stream().map(mapper::faq).toList();
    }

    @Transactional
    public FaqDto saveFaq(Long id, FaqRequest r) {
        FaqItem f = id == null ? new FaqItem() : faq.findById(id).orElseThrow(() -> ApiException.notFound("Question introuvable."));
        if (id == null) f.setPosition((int) faq.count());
        f.setQuestion(r.q().trim());
        f.setAnswer(r.a().trim());
        f.setTag(r.tag());
        return mapper.faq(faq.save(f));
    }

    @Transactional
    public void deleteFaq(Long id) {
        faq.deleteById(id);
    }

    // ------------------------------------------------------------ Contact

    @Transactional
    public void contact(ContactRequest r) {
        ContactMessage m = new ContactMessage();
        m.setName(r.name().trim());
        m.setPhone(r.phone());
        m.setEmail(r.email());
        m.setSubject(r.subject());
        m.setMessage(r.message().trim());
        messages.save(m);
    }

    @Transactional(readOnly = true)
    public List<ContactMessageDto> messages() {
        return messages.findAllByOrderByCreatedAtDesc().stream().map(mapper::contact).toList();
    }

    @Transactional
    public ContactMessageDto markHandled(Long id, boolean handled) {
        ContactMessage m = messages.findById(id).orElseThrow(() -> ApiException.notFound("Message introuvable."));
        m.setHandled(handled);
        return mapper.contact(m);
    }
}
