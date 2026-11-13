-- Les formateurs sont recrutés par le CDEJ (comptes créés par l'administration) ; les jeunes du CDEJ sont formés en salle,
-- les autres apprenants suivent en ligne les cours déposés par les formateurs.
-- Seules les réponses d'origine sont remplacées : une FAQ modifiée par l'administrateur est conservée.

update faq_items
set answer = 'Les jeunes du CDEJ Lumière de Kpévé suivent les formations en salle, dans les salles informatiques de l''Académie, avec un formateur à leur disposition. Les jeunes des autres CDEJ, les particuliers et toute personne qui souhaite une certification suivent en ligne les cours déposés par les formateurs, à leur rythme. Le formateur peut adapter la modalité si besoin.'
where answer = 'Les deux sont possibles. Les jeunes du CDEJ de Kpévé suivent en principe en salle, avec leur formateur à l''Académie. Les jeunes des autres CDEJ et les particuliers suivent en ligne, à leur rythme. Le formateur peut adapter la modalité si besoin.';

update faq_items
set question = 'Qui sont les formateurs de l''Académie ?',
    answer = 'Les formateurs sont recrutés directement par le CDEJ Lumière de Kpévé. Ils forment les jeunes du centre dans les salles informatiques et déposent leurs cours sur la plateforme pour les apprenants en ligne. Il n''y a pas d''inscription formateur sur le site : l''administration crée le compte de chaque formateur recruté.'
where question = 'Comment devenir formateur à l''Académie ?'
  and answer = 'Contactez l''Académie (page Contact, sujet « Devenir formateur »). Après échange, l''administration crée votre compte formateur et vous communique vos identifiants.';
