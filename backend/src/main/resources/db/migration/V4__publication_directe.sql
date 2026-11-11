-- Publication directe : le formateur publie lui-même sa formation, sans validation préalable par l'administration.
-- L'administrateur garde la main a posteriori (archivage).

-- Formations en attente de validation : publiées si elles remplissent les conditions de publication
-- (au moins une leçon, et un examen final avec des questions quand elles délivrent un certificat de compétence),
-- sinon remises en brouillon pour que le formateur les complète.
update courses c set status = 'PUBLIEE', submitted_at = coalesce(c.submitted_at, now())
where c.status = 'EN_VALIDATION'
  and exists (select 1 from course_modules m join lessons l on l.module_id = m.id where m.course_id = c.id)
  and (not (c.cert_types ? 'COMPETENCE')
       or exists (select 1 from exams e join exam_questions q on q.exam_id = e.id where e.course_id = c.id));
update courses set status = 'BROUILLON' where status in ('EN_VALIDATION', 'REFUSEE');

alter table courses drop constraint ck_courses_status;
alter table courses add constraint ck_courses_status check (status in ('BROUILLON', 'PUBLIEE', 'ARCHIVEE'));
alter table courses drop column review_comment;
alter table courses rename column submitted_at to published_at;

-- Notifications « Formation à valider » devenues sans objet
delete from notifications where link = '/admin/validations' and title = 'Formation à valider';
