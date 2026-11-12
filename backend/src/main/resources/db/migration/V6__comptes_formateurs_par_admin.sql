-- Les comptes formateurs sont désormais créés par l'administration : plus d'inscription formateur en libre-service.
update faq_items
set answer = 'Contactez l''Académie (page Contact, sujet « Devenir formateur »). Après échange, l''administration crée votre compte formateur et vous communique vos identifiants.'
where answer = 'Créez un compte en choisissant le profil « Formateur ». Votre compte sera activé après validation par l''administration de l''Académie.';
