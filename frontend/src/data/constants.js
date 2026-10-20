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
  'en-validation': { label: 'En validation', tone: 'amber' },
  publiee: { label: 'Publiée', tone: 'green' },
  refusee: { label: 'À revoir', tone: 'red' },
  archivee: { label: 'Archivée', tone: 'gray' },
}

export const QUESTION_TYPES = {
  unique: 'QCM – réponse unique',
  multiple: 'QCM – réponses multiples',
  vraifaux: 'Vrai / Faux',
  courte: 'Réponse courte',
  pratique: 'Exercice pratique (fichier)',
}

export const LESSON_TYPES = { video: 'Vidéo', texte: 'Lecture', pdf: 'Document PDF', image: 'Image' }

// Témoignages affichés sur la page d'accueil
export const TESTIMONIALS = [
  { name: 'Essi A.', role: 'Apprenante, CDEJ Kpévé', text: "Avant, j'avais peur de toucher un ordinateur. Aujourd'hui je tape mes devoirs sur Word et j'ai obtenu mon premier certificat !" },
  { name: 'Komlan D.', role: 'Apprenant, autre CDEJ', text: "La formation HTML m'a donné envie de devenir développeur. Les vidéos sont courtes et je peux revoir les leçons sur mon téléphone." },
  { name: 'Afi M.', role: 'Particulière, Atakpamé', text: 'Grâce au cours sur les réseaux sociaux, ma petite boutique de pagnes a maintenant des clients sur WhatsApp.' },
]

export const formatDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('fr-FR', opts) : ''

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
