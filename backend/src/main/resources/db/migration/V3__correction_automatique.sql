-- Correction entièrement automatique : le formateur ne corrige plus rien à la main.
-- Les quiz et l'examen final sont corrigés par la plateforme à partir des réponses fournies par le formateur.

-- 1. Questions « pratique » (dépôt de fichier noté par le formateur) : non corrigeables automatiquement
delete from questions where type = 'PRATIQUE';
alter table questions drop constraint ck_questions_type;
alter table questions add constraint ck_questions_type check (type in ('UNIQUE', 'MULTIPLE', 'VRAIFAUX', 'COURTE'));

-- 2. Exercices déposés et notés à la main
drop table submissions;
alter table lessons drop column practical;

-- 3. Notifications « exercice à corriger / corrigé » devenues sans objet
delete from notifications where type = 'GRADE' or link = '/formateur/corrections';
alter table notifications drop constraint ck_notifications_type;
alter table notifications add constraint ck_notifications_type check (type in ('EXAM', 'LESSON', 'CERTIFICATE', 'ENROLLMENT', 'ACCOUNT', 'COURSE'));
