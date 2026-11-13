-- Un seul document délivré par l'Académie : le certificat de compétence, après la réussite de l'examen final
-- (en ligne comme en salle). L'attestation de suivi n'est plus délivrée ; celles déjà délivrées restent valables.

-- 1. Toutes les formations délivrent le certificat de compétence
update courses set cert_types = '["COMPETENCE"]'::jsonb;

-- 2. Toute formation a un examen final : on en crée un pour les formations de démonstration qui n'en avaient pas
do $$
declare
    c_id bigint;
    e_id bigint;
    q_id bigint;
    q record;
begin
    -- Sécurité en ligne et citoyenneté numérique
    select id into c_id from courses where slug = 'securite-en-ligne' and not exists (select 1 from exams where course_id = courses.id);
    if c_id is not null then
        insert into exams (course_id, title, duration_min, question_count, randomize, pass_mark, show_correction, room_only, requires_admin_validation)
        values (c_id, 'Examen final – Sécurité en ligne et citoyenneté numérique', 15, 5, true, 60, true, false, false)
        returning id into e_id;
        for q in select * from (values
            ('UNIQUE', 'Lequel de ces mots de passe est le plus solide ?', '["123456", "kossi2006", "Mango!Lomé-2026#Vélo", "motdepasse"]', '[2]'),
            ('VRAIFAUX', 'La double authentification ajoute une protection en plus du mot de passe.', '["Vrai", "Faux"]', '[0]'),
            ('UNIQUE', 'Un SMS annonce : « Vous avez gagné 500 000 F, envoyez votre code secret ». Que faites-vous ?', '["Je réponds vite pour recevoir l''argent", "Je supprime le message sans répondre", "J''envoie le code à un ami"]', '[1]'),
            ('VRAIFAUX', 'Avant de partager une information, il faut vérifier sa source.', '["Vrai", "Faux"]', '[0]'),
            ('UNIQUE', 'Que faut-il éviter de publier sur les réseaux sociaux ?', '["Son adresse et son numéro de téléphone", "La photo d''un paysage", "Un message d''encouragement"]', '[0]')
        ) as t(kind, txt, opts, good) loop
            insert into questions (course_id, module_id, type, text, options, correct_answers, accepted_answers, points, created_at)
            values (c_id, null, q.kind, q.txt, q.opts::jsonb, q.good::jsonb, '[]'::jsonb, 1, now())
            returning id into q_id;
            insert into exam_questions (exam_id, question_id) values (e_id, q_id);
        end loop;
    end if;

    -- PowerPoint : réussir ses présentations
    c_id := null;
    select id into c_id from courses where slug = 'powerpoint-presentations' and not exists (select 1 from exams where course_id = courses.id);
    if c_id is not null then
        insert into exams (course_id, title, duration_min, question_count, randomize, pass_mark, show_correction, room_only, requires_admin_validation)
        values (c_id, 'Examen final – PowerPoint : réussir ses présentations', 15, 5, true, 60, true, false, false)
        returning id into e_id;
        for q in select * from (values
            ('UNIQUE', 'Combien d''idées principales faut-il idéalement par diapositive ?', '["Une seule", "Cinq ou six", "Toutes celles du sujet"]', '[0]'),
            ('VRAIFAUX', 'Une police trop petite rend la diapositive difficile à lire au fond de la salle.', '["Vrai", "Faux"]', '[0]'),
            ('UNIQUE', 'Quelle touche lance le diaporama depuis le début ?', '["F5", "Ctrl + S", "Échap"]', '[0]'),
            ('UNIQUE', 'Pour rendre un chiffre clé plus parlant, on peut…', '["Ajouter un graphique simple", "Écrire tout le tableau en petit", "Mettre trois animations"]', '[0]'),
            ('VRAIFAUX', 'Pendant la présentation, il vaut mieux lire ses diapositives mot à mot.', '["Vrai", "Faux"]', '[1]')
        ) as t(kind, txt, opts, good) loop
            insert into questions (course_id, module_id, type, text, options, correct_answers, accepted_answers, points, created_at)
            values (c_id, null, q.kind, q.txt, q.opts::jsonb, q.good::jsonb, '[]'::jsonb, 1, now())
            returning id into q_id;
            insert into exam_questions (exam_id, question_id) values (e_id, q_id);
        end loop;
    end if;
end $$;

-- 3. FAQ (seules les réponses d'origine sont remplacées : une FAQ modifiée par l'administrateur est conservée)
update faq_items
set question = 'Quel document reçoit-on à la fin d''une formation ?',
    answer = 'Un certificat de compétence, délivré quand vous réussissez l''examen final, que vous ayez suivi la formation en ligne ou en salle. Terminer les modules ne suffit pas : l''examen est obligatoire. Le certificat se télécharge en PDF depuis votre espace et porte un QR code de vérification.'
where question = 'Quelle est la différence entre attestation et certificat ?'
  and answer like 'L''attestation de suivi prouve que vous avez terminé%';

update faq_items
set answer = 'En ligne, l''examen s''ouvre dès que tous les modules sont terminés et vous pouvez le repasser jusqu''à la réussite. En salle, il a lieu lors de la session programmée par le formateur, en une seule tentative. Dans les deux cas, il est corrigé automatiquement et sa réussite vous donne le certificat de compétence.'
where answer = 'En ligne, l''examen s''ouvre dès que tous les modules sont terminés et vous pouvez le repasser jusqu''à la réussite. En salle, il a lieu lors de la session programmée par le formateur, en une seule tentative. Dans les deux cas, il est corrigé automatiquement et vous connaissez votre résultat tout de suite.';
