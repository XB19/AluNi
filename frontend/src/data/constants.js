// Libellés et contenus fixes de l'interface (les données viennent de l'API).

export const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé']

export const CERT_TYPES = {
  attestation: { label: 'Attestation de suivi', short: 'Attestation' },
  competence: { label: 'Certificat de compétence', short: 'Certificat' },
}

export const PROFILE_LABELS = {
  interne: 'CDEJ interne',
  'autre-cdej': 'Autre CDEJ',
  particulier: 'Particulier',
  formateur: 'Formateur',
  admin: 'Administrateur',
  apprenant: 'Apprenant',
}

export const ROLE_LABELS = { apprenant: 'Apprenant', formateur: 'Formateur', admin: 'Administrateur' }

export const STATUS_LABELS = {
  actif: 'Actif',
  'en-attente': 'En attente',
  suspendu: 'Suspendu',
  refuse: 'Refusé',
}

export const COURSE_STATUS = {
  brouillon: { label: 'Brouillon', tone: 'gray' },
  publiee: { label: 'Publiée', tone: 'green' },
  archivee: { label: 'Archivée', tone: 'gray' },
}

export const QUESTION_TYPES = {
  unique: 'QCM – réponse unique',
  multiple: 'QCM – réponses multiples',
  vraifaux: 'Vrai / Faux',
  courte: 'Réponse courte',
}

export const LESSON_TYPES = { video: 'Vidéo', texte: 'Lecture', pdf: 'Document PDF', image: 'Image' }

// Témoignages affichés sur la page d'accueil
export const TESTIMONIALS = [
  { name: 'Essi A.', role: 'Apprenante, CDEJ Kpévé', text: "Avant, j'avais peur de toucher un ordinateur. Aujourd'hui je tape mes devoirs sur Word et j'ai obtenu mon premier certificat !" },
  { name: 'Komlan D.', role: 'Apprenant, autre CDEJ', text: "La formation HTML m'a donné envie de devenir développeur. Les vidéos sont courtes et je peux revoir les leçons sur mon téléphone." },
  { name: 'Afi M.', role: 'Particulière, Atakpamé', text: 'Grâce au cours sur les réseaux sociaux, ma petite boutique de pagnes a maintenant des clients sur WhatsApp.' },
  { name: 'Yawo K.', role: 'Apprenant, CDEJ Kpévé', text: "J'ai appris à monter et réparer un ordinateur. Maintenant j'aide les voisins du quartier et je gagne un peu d'argent." },
  { name: 'Ablavi S.', role: 'Apprenante, autre CDEJ', text: "Le cours de design m'a appris à faire des affiches sur Canva. J'ai réalisé celle de la fête de notre église !" },
  { name: 'Edem T.', role: 'Étudiant, Kpalimé', text: "L'examen était sérieux et le certificat a un QR code. Mon futur employeur a pu le vérifier en quelques secondes." },
]

export const formatDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('fr-FR', opts) : ''

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

// Modalités de suivi d'une formation
export const LEARNING_MODES = {
  salle: {
    label: 'En salle',
    tone: 'blue',
    text: "Cours donné par le formateur à l'Académie. Examen final lors de la session qu'il programme : une seule tentative.",
  },
  'en-ligne': {
    label: 'En ligne',
    tone: 'green',
    text: "Modules suivis à votre rythme. Examen final ouvert dès que tous les modules sont terminés : tentatives illimitées jusqu'à la réussite.",
  },
}

// Heure de l'Académie (Kpévé, Togo), quel que soit le fuseau de l'appareil
const ZONE = { timeZone: 'Africa/Lome' }
export const formatHour = (d) => new Date(d).toLocaleTimeString('fr-FR', { ...ZONE, hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
/** « jeudi 20 novembre, 9h00 – 11h00 » */
export const formatSession = (s) =>
  s ? `${new Date(s.startsAt).toLocaleDateString('fr-FR', { ...ZONE, weekday: 'long', day: 'numeric', month: 'long' })}, ${formatHour(s.startsAt)} – ${formatHour(s.endsAt)}` : ''
