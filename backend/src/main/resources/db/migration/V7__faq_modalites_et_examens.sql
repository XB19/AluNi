-- Textes de la FAQ mis à jour : suivi en ligne / en salle, examen corrigé automatiquement,
-- certificats en PDF et récupération du mot de passe (code ou mot de passe provisoire).
-- Seules les réponses d'origine sont remplacées : une FAQ déjà modifiée par l'administrateur est conservée.

update faq_items
set answer = 'Cliquez sur « Mot de passe oublié » sur la page de connexion pour recevoir un code par SMS ou par e-mail et choisir un nouveau mot de passe. Si vous ne recevez rien, contactez l''Académie : l''administration vous communique un mot de passe provisoire, à changer ensuite dans « Mon profil ».'
where answer = 'Cliquez sur « Mot de passe oublié » sur la page de connexion. Vous recevrez un code par SMS ou par e-mail pour en créer un nouveau.';

update faq_items
set answer = 'L''attestation de suivi prouve que vous avez terminé toutes les leçons de la formation. Le certificat de compétence prouve que vous avez réussi l''examen final. Les deux se téléchargent en PDF depuis votre espace et portent un QR code de vérification.'
where answer = 'L''attestation de suivi prouve que vous avez terminé la formation. Le certificat de compétence prouve que vous avez réussi l''examen final.';

-- Deux nouvelles questions, ajoutées à une FAQ existante (une base neuve les reçoit directement du jeu de démonstration)
update faq_items set position = position + 2
where position >= 5
  and exists (select 1 from faq_items where question = 'Puis-je suivre les cours sur mon téléphone ?')
  and not exists (select 1 from faq_items where question = 'Puis-je suivre une formation en ligne ou en salle ?');

insert into faq_items (question, answer, tag, position)
select 'Puis-je suivre une formation en ligne ou en salle ?',
       'Les deux sont possibles. Les jeunes du CDEJ de Kpévé suivent en principe en salle, avec leur formateur à l''Académie. Les jeunes des autres CDEJ et les particuliers suivent en ligne, à leur rythme. Le formateur peut adapter la modalité si besoin.',
       'Formations', 5
where exists (select 1 from faq_items where question = 'Puis-je suivre les cours sur mon téléphone ?')
  and not exists (select 1 from faq_items where question = 'Puis-je suivre une formation en ligne ou en salle ?');

insert into faq_items (question, answer, tag, position)
select 'Comment se passe l''examen final ?',
       'En ligne, l''examen s''ouvre dès que tous les modules sont terminés et vous pouvez le repasser jusqu''à la réussite. En salle, il a lieu lors de la session programmée par le formateur, en une seule tentative. Dans les deux cas, il est corrigé automatiquement et vous connaissez votre résultat tout de suite.',
       'Examens', 6
where exists (select 1 from faq_items where question = 'Puis-je suivre les cours sur mon téléphone ?')
  and not exists (select 1 from faq_items where question = 'Comment se passe l''examen final ?');
