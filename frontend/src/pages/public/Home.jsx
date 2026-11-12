import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowRight, Award, BadgeCheck, BookOpen, Building2, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, GraduationCap, Heart, HelpCircle,
  Laptop, Lightbulb, MessageCircleQuestion, ShieldCheck, Smartphone, User, UserPlus, Users, WifiOff,
} from 'lucide-react'
import { TESTIMONIALS, formatDate } from '../../data/constants'
import { useApi } from '../../api/useApi'
import { fileUrl } from '../../api/client'
import { useAcademy, useSettings } from '../../context/SettingsContext'
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext'
import { CategoryIcon, CourseCard } from '../../components/CourseCard'
import { CountUp, CourseGridSkeleton, Reveal } from '../../components/Motion'
import Certificate from '../../components/Certificate'
import { openAssistant } from '../../components/Assistant'
import { Avatar, Badge, Button, cx, SectionTitle } from '../../components/ui'
import heroJpg from '../../assets/hero-apprenante.jpg'
import heroJpg720 from '../../assets/hero-apprenante-720.jpg'
import heroWebp from '../../assets/hero-apprenante.webp'
import heroWebp720 from '../../assets/hero-apprenante-720.webp'

export function useStats() {
  const s = useSettings()
  return [
    { value: s['stats.learners'], label: 'jeunes formés' },
    { value: s['stats.courses'], label: 'formations disponibles' },
    { value: s['stats.certificates'], label: 'certificats délivrés' },
    { value: s['stats.computers'], label: 'ordinateurs en salle' },
  ]
}

// Mots mis en valeur en orange dans le grand titre (le titre est modifiable par l'administrateur)
const HIGHLIGHT = /(numériques?|formations?|certifications?|certificats?)/gi

function highlight(text) {
  return text.split(HIGHLIGHT).map((part, i) =>
    i % 2 === 1 ? <span key={i} className="bg-[linear-gradient(transparent_64%,var(--color-flame-400)_64%,var(--color-flame-400)_92%,transparent_92%)] box-decoration-clone">{part}</span> : part,
  )
}

/** Décalage progressif des apparitions dans une grille (ms). */
const stagger = (i, step = 90, columns = 4) => (i % columns) * step

function Hero() {
  const { user } = useAuth()
  const s = useSettings()
  const [first, ...rest] = (s['home.heroTitle'] ?? '').split('. ')
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="pointer-events-none absolute -top-24 -right-24 size-[420px] rounded-full bg-flame-100/60 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-32 size-[360px] rounded-full bg-brand-100/70 blur-3xl" />
      <div className="container-page relative grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <h1 className="animate-fade-up text-[34px] leading-[1.1] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[56px]">
            {rest.length ? (
              <>
                {highlight(first)}.
                <br />
                <span className="text-brand-600">{highlight(rest.join('. '))}</span>
              </>
            ) : (
              highlight(first)
            )}
          </h1>
          <p className="animate-fade-up mt-5 max-w-xl text-lg leading-relaxed text-gray-700" style={{ '--delay': '120ms' }}>{s['home.heroSubtitle']}</p>
          <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row" style={{ '--delay': '240ms' }}>
            <Button to={user ? HOME_BY_ROLE[user.role] : '/inscription'} size="lg" className="shadow-lg shadow-brand-600/20 hover:-translate-y-0.5">
              {!user ? 'Commencer gratuitement' : user.role === 'apprenant' ? 'Continuer mon apprentissage' : 'Aller à mon espace'} <ArrowRight className="arrow-slide size-5" />
            </Button>
            <Button to="/formations" size="lg" variant="outline-gray" className="hover:-translate-y-0.5">Voir les formations</Button>
          </div>
          <div className="animate-fade-up mt-8 flex items-center gap-4" style={{ '--delay': '360ms' }}>
            <div className="flex -space-x-2">
              {['Essi A', 'Komlan D', 'Afi M', 'Kodjo L'].map((n) => (
                <Avatar key={n} name={n} size="sm" className="ring-2 ring-white transition hover:z-10 hover:-translate-y-1" />
              ))}
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-bold text-ink">{s['stats.learners']} jeunes</span> déjà formés à l'Académie
            </p>
          </div>
        </div>

        {/* Composition visuelle */}
        <div className="animate-zoom-in relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-none" style={{ '--delay': '150ms' }}>
          {/* Cadre décoratif décalé aux couleurs du CDEJ */}
          <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[2rem] bg-gradient-to-br from-flame-400 to-brand-600 opacity-90 sm:translate-x-6 sm:translate-y-6" aria-hidden />
          <div className="group relative overflow-hidden rounded-[2rem] shadow-2xl ring-4 ring-white">
            <picture>
              <source type="image/webp" srcSet={`${heroWebp720} 720w, ${heroWebp} 1200w`} sizes="(min-width: 1024px) 560px, 92vw" />
              <img
                src={heroJpg}
                srcSet={`${heroJpg720} 720w, ${heroJpg} 1200w`}
                sizes="(min-width: 1024px) 560px, 92vw"
                width="1200"
                height="900"
                fetchPriority="high"
                alt="Une apprenante souriante travaille sur un ordinateur de la salle informatique"
                className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"
              />
            </picture>
          </div>
          <div className="absolute right-4 bottom-4 hidden items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow-lg backdrop-blur sm:flex">
            <Laptop className="size-4 text-brand-600" />
            {s['stats.computers']} postes à Kpévé
          </div>
          <div className="animate-fade-up absolute -bottom-6 -left-4 sm:-left-10" style={{ '--delay': '700ms' }}>
            <div className="animate-float flex items-center gap-3 rounded-2xl bg-white p-3 pr-5 shadow-xl">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-100 text-brand-700"><CheckCircle2 className="size-5" /></span>
              <div>
                <p className="text-xs text-gray-500">Examen final</p>
                <p className="text-sm font-bold">Admis · 86 / 100</p>
              </div>
            </div>
          </div>
          <div className="animate-fade-up absolute -top-5 -right-3 sm:-right-8 lg:-right-3 xl:-right-8" style={{ '--delay': '900ms' }}>
            <div className="animate-float flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl" style={{ '--delay': '1.5s' }}>
              <QRCodeSVG value={`${window.location.origin}/verifier`} size={44} fgColor="#1b335d" />
              <div className="pr-2">
                <p className="text-xs text-gray-500">Certificat</p>
                <p className="flex items-center gap-1 text-sm font-bold text-brand-700"><BadgeCheck className="size-4" /> Vérifié</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const stats = useStats()
  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="container-page grid grid-cols-2 gap-6 py-10 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={stagger(i)} className="text-center lg:border-r lg:border-gray-100 lg:last:border-0">
            <p className="text-3xl font-extrabold text-brand-700 tabular-nums sm:text-4xl"><CountUp value={s.value} /></p>
            <p className="mt-1 text-sm text-gray-600">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Categories({ categories }) {
  return (
    <section className="container-page py-16">
      <Reveal><SectionTitle eyebrow="Explorer" title="Choisissez votre domaine" subtitle="Des parcours pensés pour débuter, progresser et trouver un emploi." /></Reveal>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {categories.map((c, i) => (
          <Reveal key={c.id} delay={stagger(i, 80, 3)}>
            <Link
              to={`/formations?categorie=${c.id}`}
              className="group flex h-full min-w-0 flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg sm:flex-row sm:items-center sm:gap-4 sm:p-5"
            >
              <span className={cx('flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition duration-300 group-hover:scale-110 group-hover:-rotate-3 sm:size-14', c.color)}>
                <CategoryIcon icon={c.icon} className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-snug font-bold text-ink group-hover:text-brand-700">{c.name}</span>
                <span className="text-sm text-gray-500">{c.count} formation{c.count > 1 ? 's' : ''}</span>
              </span>
              <ArrowRight className="arrow-slide hidden size-4 text-gray-300 group-hover:text-brand-600 sm:block" />
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function PopularCourses({ courses, loading, categories }) {
  const [tab, setTab] = useState('all')
  const list = (tab === 'all' ? courses.filter((c) => c.popular || c.isNew) : courses.filter((c) => c.category === tab)).slice(0, 4)
  return (
    <section className="bg-gray-50 py-16">
      <div className="container-page">
        <Reveal>
          <SectionTitle
            eyebrow="Formations"
            title="Les formations les plus suivies"
            action={<Link to="/formations" className="group flex items-center gap-1 font-bold text-brand-700 hover:underline">Tout voir <ArrowRight className="arrow-slide size-4" /></Link>}
          />
        </Reveal>
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
          {[{ id: 'all', name: 'Populaires' }, ...categories.filter((c) => c.count > 0)].map((c) => (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={cx(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition duration-200',
                tab === c.id ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/20' : 'border-gray-300 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-700',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        {loading ? (
          <CourseGridSkeleton count={4} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" />
        ) : (
          // La clé relance l'animation quand on change d'onglet
          <div key={tab} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((c, i) => (
              <div key={c.slug} className="animate-fade-up" style={{ '--delay': `${i * 80}ms` }}>
                <CourseCard course={c} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { icon: UserPlus, title: 'Créez votre compte', text: 'Gratuitement, avec votre numéro de téléphone ou votre e-mail, en 2 minutes.' },
    { icon: BookOpen, title: 'Suivez la formation', text: "En ligne à votre rythme, ou en salle à l'Académie avec votre formateur." },
    { icon: ClipboardCheck, title: "Passez l'examen final", text: 'Corrigé automatiquement : vous connaissez votre résultat tout de suite.' },
    { icon: Award, title: 'Recevez votre certificat', text: 'À télécharger en PDF, avec un QR code qui le rend vérifiable partout.' },
  ]
  return (
    <section className="container-page py-16">
      <Reveal><SectionTitle center eyebrow="Comment ça marche" title="De l'inscription au certificat, en 4 étapes" /></Reveal>
      <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Fil reliant les étapes (grand écran) */}
        <div className="absolute top-12 right-[12%] left-[12%] hidden border-t-2 border-dashed border-brand-200 lg:block" aria-hidden />
        {steps.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 120} className="group relative rounded-2xl border border-gray-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
            <span className="absolute top-5 right-5 text-4xl font-extrabold text-gray-100 transition group-hover:text-brand-100">0{i + 1}</span>
            <span className="relative flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30 transition duration-300 group-hover:scale-110">
              <s.icon className="size-6" />
            </span>
            <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
            <p className="mt-1.5 text-gray-600">{s.text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

function Audiences() {
  const { user } = useAuth()
  // Connecté : plus d'invitation à créer un compte, on mène aux formations (ou à l'espace formateur)
  const learnerTo = user ? '/formations' : '/inscription'
  // Les comptes formateurs sont créés par l'administration : on passe par le formulaire de contact
  const trainerTo = user?.role === 'formateur' ? '/formateur' : '/contact?sujet=formateur'
  const items = [
    { icon: Heart, title: 'Jeunes du CDEJ Kpévé', text: "Les formations du programme du centre, suivies en salle à l'Académie avec votre formateur.", to: learnerTo, cta: user ? 'Voir les formations' : 'Commencer' },
    { icon: Building2, title: 'Jeunes des autres CDEJ', text: "Formez-vous en ligne, à votre rythme, et obtenez votre certificat dès l'examen final réussi.", to: learnerTo, cta: user ? 'Voir les formations' : 'Commencer' },
    { icon: User, title: 'Particuliers', text: 'Développez vos compétences en ligne ou faites certifier ce que vous savez déjà faire.', to: learnerTo, cta: user ? 'Voir les formations' : 'Commencer' },
    { icon: GraduationCap, title: 'Formateurs', text: "Partagez votre savoir : l'Académie crée votre compte, vous publiez vos cours et accompagnez les apprenants.", to: trainerTo,
      cta: user?.role === 'formateur' ? 'Mon espace formateur' : 'Nous contacter' },
  ]
  return (
    <section className="relative overflow-hidden bg-brand-900 py-16 text-white">
      <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-flame-500/10 blur-3xl" />
      <div className="container-page relative">
        <Reveal className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-bold tracking-wide text-flame-400 uppercase">Pour qui ?</p>
          <h2 className="text-2xl font-extrabold sm:text-3xl">Une académie ouverte à tous ceux qui veulent apprendre</h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={stagger(i)}>
              <Link to={it.to} className="group flex h-full flex-col rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:bg-white/10 hover:ring-flame-400/40">
                <it.icon className="size-8 text-flame-400 transition duration-300 group-hover:scale-110" />
                <h3 className="mt-4 text-lg font-bold">{it.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-brand-100">{it.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white">
                  {it.cta} <ArrowRight className="arrow-slide size-4" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Certification() {
  const s = useSettings()
  const sampleCert = {
    code: 'ALUNI-2026-000148',
    name: 'Essi AGBEKO',
    course: { title: "Initiation à l'informatique" },
    type: 'competence',
    status: 'valide',
    date: '2026-10-05',
    template: s['certificate.template'],
    signatory: s['certificate.signatory'] || 'Le Coordinateur',
    signatoryTitle: s['certificate.signatoryTitle'] || "Responsable de l'Académie",
    signature: '3F9A2C71',
    verifyUrl: `${window.location.origin}/verifier/ALUNI-2026-000148`,
  }
  return (
    <section className="container-page grid items-center gap-12 py-16 lg:grid-cols-2">
      <Reveal className="order-2 lg:order-1">
        {/* Aperçu de certificat : le vrai modèle, avec le modèle de couleurs et le signataire choisis par l'administrateur */}
        <div className="mx-auto max-w-xl rotate-[-2deg] transition duration-500 hover:rotate-0">
          <Certificate cert={sampleCert} className="rounded-xl shadow-2xl" />
        </div>
      </Reveal>
      <Reveal className="order-1 lg:order-2" delay={120}>
        <p className="mb-2 text-sm font-bold tracking-wide text-flame-600 uppercase">Certification</p>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Des certificats sécurisés, vérifiables en un scan</h2>
        <p className="mt-4 text-lg text-gray-700">
          Chaque document porte un numéro unique, une signature numérique et un QR code. Vous le téléchargez en PDF depuis votre
          espace, et un employeur confirme son authenticité en quelques secondes.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-gold-100 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md">
            <BookOpen className="size-6 text-gold-700" />
            <h3 className="mt-3 font-bold">Attestation de suivi</h3>
            <p className="mt-1 text-sm text-gray-700">Délivrée automatiquement quand vous avez terminé toutes les leçons.</p>
          </div>
          <div className="rounded-2xl bg-brand-50 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md">
            <ShieldCheck className="size-6 text-brand-700" />
            <h3 className="mt-3 font-bold">Certificat de compétence</h3>
            <p className="mt-1 text-sm text-gray-700">Délivré quand vous avez réussi l'examen final de la formation.</p>
          </div>
        </div>
        <Button to="/verifier" variant="outline" className="mt-7"><BadgeCheck className="size-5" /> Vérifier un certificat</Button>
      </Reveal>
    </section>
  )
}

function Vision() {
  const academy = useAcademy()
  const s = useSettings()
  return (
    <section className="bg-flame-50 py-16">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <Reveal>
          <p className="mb-2 text-sm font-bold tracking-wide text-flame-600 uppercase">Notre vision</p>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Que chaque jeune devienne une lumière grâce au numérique</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-700">
            Née au sein du {academy.center}, l'{academy.name} ({academy.short}) veut donner à chaque jeune les compétences
            numériques pour réussir ses études, trouver un emploi ou créer son activité. {s['about.vision']}
          </p>
          <Button to="/a-propos" variant="flame" className="mt-7 hover:-translate-y-0.5">Découvrir l'Académie <ArrowRight className="arrow-slide size-4" /></Button>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Lightbulb, title: 'Apprendre en pratiquant', text: "Des quiz et des exercices concrets dans chaque module, en salle ou à la maison." },
            { icon: Smartphone, title: 'Accessible partout', text: 'La plateforme fonctionne sur tous les téléphones, même avec une connexion modeste.' },
            { icon: WifiOff, title: 'Rien ne se perd', text: 'Progression et réponses enregistrées automatiquement, même en cas de coupure.' },
            { icon: Users, title: 'Accompagnement humain', text: "Des formateurs présents à l'Académie pour vous aider et vous encourager." },
          ].map((v, i) => (
            <Reveal key={v.title} delay={stagger(i, 100, 2)} className="group rounded-2xl bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
              <span className="flex size-11 items-center justify-center rounded-xl bg-flame-50 transition duration-300 group-hover:scale-110 group-hover:bg-flame-100">
                <v.icon className="size-6 text-flame-500" />
              </span>
              <h3 className="mt-3 font-bold">{v.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{v.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const AUTOPLAY_MS = 6000
const PORTRAIT_TONES = [
  'from-brand-600 to-brand-800',
  'from-brand-800 to-brand-950',
  'from-brand-500 to-brand-700',
  'from-brand-700 to-brand-900',
  'from-brand-400 to-brand-700',
  'from-brand-900 to-brand-600',
]
const initials = (name) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

/** Portrait du témoin : sa photo si elle existe, sinon un portrait aux initiales. */
function TestimonialPortrait({ t, index }) {
  if (t.photo) return <img src={t.photo} alt={t.name} loading="lazy" className="size-full object-cover" />
  return (
    <div className={cx('relative flex size-full items-center justify-center overflow-hidden bg-gradient-to-br text-white', PORTRAIT_TONES[index % PORTRAIT_TONES.length])}>
      <span className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-14 -left-8 size-48 rounded-full bg-black/10" />
      <span className="relative text-6xl font-extrabold tracking-tight sm:text-7xl">{initials(t.name)}</span>
    </div>
  )
}

function Testimonials() {
  const count = TESTIMONIALS.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touch = useRef(null)

  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count])

  // Défilement automatique ; pause au survol, au focus clavier et quand l'onglet est caché
  useEffect(() => {
    if (paused) return
    const id = setTimeout(() => !document.hidden && go(index + 1), AUTOPLAY_MS)
    return () => clearTimeout(id)
  }, [index, paused, go])

  // Glisser du doigt sur mobile
  const onTouchStart = (e) => { touch.current = e.touches[0].clientX; setPaused(true) }
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - (touch.current ?? 0)
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
    touch.current = null
    setPaused(false)
  }

  const arrow = 'flex size-12 items-center justify-center rounded-xl border border-white/80 bg-white text-brand-800 shadow-lg transition hover:bg-brand-50 active:scale-95 focus-visible:outline-2 focus-visible:outline-flame-400'

  return (
    <section className="bg-brand-900 py-16" aria-roledescription="carrousel" aria-label="Témoignages">
      <div className="container-page">
        <Reveal className="mb-10 text-center">
          <p className="mb-2 text-sm font-bold tracking-wide text-flame-400 uppercase">Témoignages</p>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Ils ont appris avec ALuNI</h2>
        </Reveal>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(index - 1); if (e.key === 'ArrowRight') go(index + 1) }}
        >
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="flex transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
              {TESTIMONIALS.map((t, i) => (
                <figure
                  key={t.name}
                  aria-roledescription="diapositive"
                  aria-label={`${i + 1} sur ${count}`}
                  aria-hidden={i !== index}
                  className="grid w-full shrink-0 items-center gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12 md:px-16 md:py-10 lg:px-24"
                >
                  <div className="mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl md:max-w-[360px]">
                    <TestimonialPortrait t={t} index={i} />
                  </div>
                  <div className="flex gap-3 sm:gap-5">
                    <span className="-mt-2 shrink-0 font-serif text-6xl leading-none font-bold text-brand-800 select-none sm:text-7xl" aria-hidden>“</span>
                    <div className="min-w-0">
                      <blockquote className="text-lg leading-relaxed text-ink sm:text-xl md:text-2xl md:leading-snug">{t.text}</blockquote>
                      <figcaption className="mt-6 sm:mt-10">
                        <p className="font-bold text-ink">{t.name}</p>
                        <p className="mt-0.5 text-sm text-gray-600">{t.role}</p>
                      </figcaption>
                    </div>
                  </div>
                </figure>
              ))}
            </div>
          </div>

          {/* Flèches sur les bords de la carte (écrans moyens et grands) */}
          <button type="button" onClick={() => go(index - 1)} className={cx(arrow, 'absolute top-1/2 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex')} aria-label="Témoignage précédent"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={() => go(index + 1)} className={cx(arrow, 'absolute top-1/2 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex')} aria-label="Témoignage suivant"><ChevronRight className="size-5" /></button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button type="button" onClick={() => go(index - 1)} className={cx(arrow, 'size-10 md:hidden')} aria-label="Témoignage précédent"><ChevronLeft className="size-5" /></button>
          <div className="flex items-center gap-2.5">
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => go(i)}
                aria-label={`Témoignage ${i + 1} : ${t.name}`}
                aria-current={i === index}
                className={cx('h-3 rounded-full transition-all duration-500', i === index ? 'w-8 bg-flame-500' : 'w-3 bg-white/80 hover:bg-white')}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(index + 1)} className={cx(arrow, 'size-10 md:hidden')} aria-label="Témoignage suivant"><ChevronRight className="size-5" /></button>
        </div>
      </div>
    </section>
  )
}

export const NEWS_COVERS = ['bg-brand-700', 'bg-flame-400', 'bg-brand-900']

export function NewsCover({ item, index, className }) {
  const image = fileUrl(item.image)
  return (
    <div className={cx('relative flex items-end overflow-hidden p-4', !image && NEWS_COVERS[index % 3], className)}>
      {image && <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105" />}
      {item.category && <Badge className="relative bg-white text-ink">{item.category}</Badge>}
    </div>
  )
}

function LatestNews({ news }) {
  if (!news.length) return null
  return (
    <section className="bg-gray-50 py-16">
      <div className="container-page">
        <Reveal>
          <SectionTitle
            eyebrow="Actualités"
            title="La vie de l'Académie"
            action={<Link to="/actualites" className="group flex items-center gap-1 font-bold text-brand-700 hover:underline">Toutes les actualités <ArrowRight className="arrow-slide size-4" /></Link>}
          />
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {news.slice(0, 3).map((n, i) => (
            <Reveal key={n.slug} delay={i * 120}>
              <Link to={`/actualites/${n.slug}`} className="group block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <NewsCover item={n} index={i} className="aspect-[16/8]" />
                <div className="p-5">
                  <p className="text-sm text-gray-500">{formatDate(n.date)}</p>
                  <h3 className="mt-1 text-lg leading-snug font-bold group-hover:text-brand-700">{n.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{n.excerpt}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Les partenaires défilent en continu (pause au survol). */
function Partners({ partners }) {
  if (!partners.length) return null
  // Répète la liste pour remplir largement l'écran, puis la double pour une boucle sans à-coup
  const base = Array.from({ length: Math.max(1, Math.ceil(8 / partners.length)) }, () => partners).flat()
  const track = [...base, ...base]
  return (
    <section className="py-12">
      <Reveal as="p" className="mb-6 text-center text-sm font-semibold text-gray-500">Avec le soutien de nos partenaires</Reveal>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="animate-marquee flex w-max items-center gap-4">
          {track.map((p, i) =>
            p.logo ? (
              <img key={i} src={fileUrl(p.logo)} alt={i < base.length ? p.name : ''} aria-hidden={i >= base.length} className="h-12 shrink-0 rounded-lg object-contain grayscale transition hover:grayscale-0" />
            ) : (
              <span key={i} aria-hidden={i >= base.length} className="shrink-0 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold whitespace-nowrap text-gray-500 transition hover:border-brand-300 hover:text-brand-700">
                {p.name}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  )
}

/** Accès rapide à la FAQ : les premières questions s'ouvrent sur place, le reste sur la page dédiée. */
function FaqPreview({ faq }) {
  const academy = useAcademy()
  const [open, setOpen] = useState(0)
  if (!faq.length) return null
  const items = faq.slice(0, 5)
  return (
    <section className="container-page grid gap-10 py-16 lg:grid-cols-[1fr_1.6fr]">
      <Reveal>
        <p className="mb-2 text-sm font-bold tracking-wide text-flame-600 uppercase">Questions fréquentes</p>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Vous avez une question ?</h2>
        <p className="mt-3 text-lg text-gray-700">Inscription, compte, formations en ligne ou en salle, examens, certificats : les réponses aux questions les plus posées. Et pour tout le reste, notre assistant vous répond tout de suite.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button to="/faq" className="hover:-translate-y-0.5"><HelpCircle className="size-5" />Toutes les questions</Button>
          <Button onClick={() => openAssistant()} variant="outline-gray" className="hover:-translate-y-0.5"><MessageCircleQuestion className="size-5" />Poser ma question</Button>
        </div>
        {academy.phone && <p className="mt-4 text-sm text-gray-600">Ou appelez-nous au <a href={`tel:${academy.phone.replace(/\s/g, '')}`} className="font-semibold text-brand-700 hover:underline">{academy.phone}</a></p>}
      </Reveal>
      <Reveal delay={120} className="divide-y divide-gray-200 self-start rounded-2xl border border-gray-200 bg-white">
        {items.map((f, i) => (
          <div key={f.id}>
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50">
              <span className="flex-1 font-bold">{f.q}</span>
              <ChevronDown className={cx('size-5 shrink-0 text-gray-500 transition duration-300', open === i && 'rotate-180 text-brand-600')} />
            </button>
            {open === i && <p className="animate-fade-in px-5 pb-5 leading-relaxed whitespace-pre-line text-gray-700">{f.a}</p>}
          </div>
        ))}
        <Link to="/faq" className="group flex items-center justify-between px-5 py-4 text-sm font-bold text-brand-700 hover:bg-brand-50">
          Voir les {faq.length} questions <ArrowRight className="arrow-slide size-4" />
        </Link>
      </Reveal>
    </section>
  )
}

function FinalCta() {
  const { user } = useAuth()
  return (
    <section className="container-page pb-16">
      <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 to-brand-600 px-6 py-12 text-center text-white sm:px-12">
        <div className="animate-float pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-flame-500/30 blur-2xl" />
        <div className="animate-float pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-white/10 blur-2xl" style={{ '--delay': '2s' }} />
        <h2 className="relative text-2xl font-extrabold sm:text-4xl">{user ? `Bon retour, ${user.firstName ?? user.name?.split(' ')[0] ?? ''} !` : 'Prêt à allumer votre avenir numérique ?'}</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-brand-100">
          {!user ? "Créez votre compte gratuitement et commencez votre première formation dès aujourd'hui."
            : user.role === 'apprenant' ? 'Retrouvez vos formations, vos examens et vos certificats dans votre espace.'
            : 'Retrouvez vos outils de gestion dans votre espace.'}
        </p>
        <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {user ? (
            <Button to={HOME_BY_ROLE[user.role]} variant="white" size="lg" className="hover:-translate-y-0.5">Aller à mon espace <ArrowRight className="arrow-slide size-5" /></Button>
          ) : (
            <Button to="/inscription" variant="white" size="lg" className="hover:-translate-y-0.5">Créer mon compte <ArrowRight className="arrow-slide size-5" /></Button>
          )}
          <Button to="/contact" size="lg" className="bg-white/10 ring-1 ring-white/30 hover:-translate-y-0.5 hover:bg-white/20">Nous contacter</Button>
        </div>
      </Reveal>
    </section>
  )
}

export default function Home() {
  const categories = useApi('/categories').data ?? []
  const coursesState = useApi('/courses')
  const news = useApi('/news').data ?? []
  const partners = useApi('/partners').data ?? []
  const faq = useApi('/faq').data ?? []
  const courses = coursesState.data ?? []
  return (
    <>
      <Hero />
      <Stats />
      <Categories categories={categories} />
      {(coursesState.loading || courses.length > 0) && <PopularCourses courses={courses} loading={coursesState.loading && !coursesState.data} categories={categories} />}
      <HowItWorks />
      <Audiences />
      <Certification />
      <Vision />
      <Testimonials />
      <LatestNews news={news} />
      <FaqPreview faq={faq} />
      <Partners partners={partners} />
      <FinalCta />
    </>
  )
}
