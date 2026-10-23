import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowRight, Award, BadgeCheck, BookOpen, Building2, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, GraduationCap, Heart,
  Laptop, Lightbulb, Quote, ShieldCheck, Smartphone, User, UserPlus, Users, WifiOff,
} from 'lucide-react'
import { TESTIMONIALS, formatDate } from '../../data/constants'
import { useApi } from '../../api/useApi'
import { fileUrl } from '../../api/client'
import { useAcademy, useSettings } from '../../context/SettingsContext'
import { CategoryIcon, CourseCard } from '../../components/CourseCard'
import { CountUp, CourseGridSkeleton, Reveal } from '../../components/Motion'
import { Avatar, Badge, Button, cx, SectionTitle } from '../../components/ui'
import logo from '../../assets/logo-cdej.jpg'
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
    i % 2 === 1 ? <span key={i} className="text-flame-500">{part}</span> : part,
  )
}

/** Décalage progressif des apparitions dans une grille (ms). */
const stagger = (i, step = 90, columns = 4) => (i % columns) * step

function Hero() {
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
            <Button to="/inscription" size="lg" className="shadow-lg shadow-brand-600/20 hover:-translate-y-0.5">
              Commencer gratuitement <ArrowRight className="arrow-slide size-5" />
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
          <div className="animate-fade-up absolute -top-5 -right-3 sm:-right-8" style={{ '--delay': '900ms' }}>
            <div className="animate-float flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl" style={{ '--delay': '1.5s' }}>
              <QRCodeSVG value={`${window.location.origin}/verifier`} size={44} fgColor="#16592b" />
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
    { icon: UserPlus, title: 'Créez votre compte', text: 'Avec votre numéro de téléphone ou votre e-mail, en 2 minutes.' },
    { icon: BookOpen, title: 'Suivez les cours', text: 'Vidéos courtes, textes et exercices, à votre rythme.' },
    { icon: ClipboardCheck, title: "Passez l'examen", text: 'En ligne ou en salle, avec correction immédiate.' },
    { icon: Award, title: 'Recevez votre certificat', text: 'Un certificat numérique avec QR code, vérifiable partout.' },
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
  const items = [
    { icon: Heart, title: 'Jeunes du CDEJ', text: 'Accès aux formations du programme du centre, en salle et en ligne.', to: '/inscription' },
    { icon: Building2, title: 'Jeunes des autres CDEJ', text: "Formez-vous à distance et venez passer vos examens supervisés à l'Académie.", to: '/inscription' },
    { icon: User, title: 'Particuliers', text: 'Développez vos compétences ou faites certifier ce que vous savez déjà faire.', to: '/inscription' },
    { icon: GraduationCap, title: 'Formateurs', text: 'Partagez votre savoir : publiez vos cours et accompagnez les apprenants.', to: '/inscription?role=formateur' },
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
                  Commencer <ArrowRight className="arrow-slide size-4" />
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
  return (
    <section className="container-page grid items-center gap-12 py-16 lg:grid-cols-2">
      <Reveal className="order-2 lg:order-1">
        {/* Aperçu de certificat */}
        <div className="relative mx-auto max-w-lg rotate-[-2deg] rounded-2xl border-[6px] border-gold-400 bg-white p-6 shadow-2xl transition duration-500 hover:rotate-0 hover:shadow-gold-400/30 sm:p-8">
          <div className="flex items-center justify-between">
            <img src={logo} alt="" className="size-12 object-contain" />
            <span className="text-right text-xs font-bold text-brand-700">ALuNI<br /><span className="font-medium text-gray-500">CDEJ TG0157</span></span>
          </div>
          <p className="mt-5 text-center text-xs font-bold tracking-[0.3em] text-gold-700 uppercase">Certificat de compétence</p>
          <p className="mt-3 text-center text-sm text-gray-500">décerné à</p>
          <p className="mt-1 text-center text-2xl font-extrabold text-brand-800">Essi AGBEKO</p>
          <p className="mt-2 text-center text-sm text-gray-600">pour la réussite de la formation <strong>Initiation à l'informatique</strong></p>
          <div className="mt-6 flex items-end justify-between">
            <div className="text-xs text-gray-500">N° ALUNI-2026-000148<br />Mention : Très bien</div>
            <QRCodeSVG value={`${window.location.origin}/verifier/ALUNI-2026-000148`} size={56} fgColor="#16592b" />
          </div>
        </div>
      </Reveal>
      <Reveal className="order-1 lg:order-2" delay={120}>
        <p className="mb-2 text-sm font-bold tracking-wide text-flame-600 uppercase">Certification</p>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Des certificats infalsifiables, vérifiables en un scan</h2>
        <p className="mt-4 text-lg text-gray-700">Chaque certificat porte un numéro unique, une signature numérique et un QR code. Un employeur peut confirmer son authenticité en quelques secondes.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-gold-100 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md">
            <BookOpen className="size-6 text-gold-700" />
            <h3 className="mt-3 font-bold">Attestation de suivi</h3>
            <p className="mt-1 text-sm text-gray-700">Vous avez terminé toutes les leçons de la formation.</p>
          </div>
          <div className="rounded-2xl bg-brand-50 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-md">
            <ShieldCheck className="size-6 text-brand-700" />
            <h3 className="mt-3 font-bold">Certificat de compétence</h3>
            <p className="mt-1 text-sm text-gray-700">Vous avez réussi l'examen final de la formation.</p>
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
            Né au sein du {academy.center}, ALuNI veut donner à chaque jeune les compétences numériques pour réussir ses
            études, trouver un emploi ou créer son activité. {s['about.vision']}
          </p>
          <Button to="/a-propos" variant="flame" className="mt-7 hover:-translate-y-0.5">Découvrir l'Académie <ArrowRight className="arrow-slide size-4" /></Button>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Lightbulb, title: 'Apprendre en pratiquant', text: 'Des exercices concrets dans chaque module, en salle ou à la maison.' },
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

const AUTOPLAY_MS = 4000

function Testimonials() {
  const track = useRef(null)
  const [paused, setPaused] = useState(false)
  const [active, setActive] = useState(0)
  const [pages, setPages] = useState(1)

  // Nombre de cartes visibles et page courante, recalculés au défilement et au redimensionnement
  const measure = useCallback(() => {
    const el = track.current
    if (!el?.firstElementChild) return
    const step = el.firstElementChild.getBoundingClientRect().width + 20
    const perView = Math.max(1, Math.round(el.clientWidth / step))
    setPages(Math.max(1, TESTIMONIALS.length - perView + 1))
    setActive(Math.round(el.scrollLeft / step))
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const goTo = useCallback((index) => {
    const el = track.current
    if (!el?.firstElementChild) return
    const step = el.firstElementChild.getBoundingClientRect().width + 20
    const perView = Math.max(1, Math.round(el.clientWidth / step))
    const last = Math.max(0, TESTIMONIALS.length - perView)
    const target = index > last ? 0 : index < 0 ? last : index
    el.scrollTo({ left: target * step, behavior: 'smooth' })
  }, [])

  // Défilement automatique en continu : pause seulement pendant le survol ou le toucher, reprise ensuite
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => !document.hidden && goTo(active + 1), AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [paused, active, goTo])

  const resume = useRef(null)
  const holdOnTouch = () => {
    setPaused(true)
    clearTimeout(resume.current)
  }
  const releaseTouch = () => {
    clearTimeout(resume.current)
    resume.current = setTimeout(() => setPaused(false), 3000)
  }
  useEffect(() => () => clearTimeout(resume.current), [])

  const arrow = 'flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-95'

  return (
    <section className="container-page py-16" aria-roledescription="carrousel" aria-label="Témoignages">
      <Reveal className="relative">
        <SectionTitle center eyebrow="Témoignages" title="Ils ont appris avec ALuNI" />
        <div className="absolute right-0 bottom-8 hidden gap-2 md:flex">
          <button type="button" onClick={() => goTo(active - 1)} className={arrow} aria-label="Témoignage précédent"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={() => goTo(active + 1)} className={arrow} aria-label="Témoignage suivant"><ChevronRight className="size-5" /></button>
        </div>
      </Reveal>

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={holdOnTouch}
        onTouchEnd={releaseTouch}
      >
        <div ref={track} onScroll={measure} className="no-scrollbar -my-2 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth py-2">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.name}
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${TESTIMONIALS.length}`}
              className="flex w-[85%] shrink-0 snap-start flex-col rounded-2xl border border-gray-200 bg-white p-6 transition duration-300 hover:border-brand-200 hover:shadow-lg sm:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)]"
            >
              <Quote className="size-8 text-brand-200" />
              <blockquote className="mt-3 flex-1 leading-relaxed text-gray-700">« {t.text} »</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
                <Avatar name={t.name} />
                <div>
                  <p className="font-bold">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button type="button" onClick={() => goTo(active - 1)} className={cx(arrow, 'md:hidden')} aria-label="Témoignage précédent"><ChevronLeft className="size-5" /></button>
        <div className="flex gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Aller au témoignage ${i + 1}`}
              aria-current={i === active}
              className={cx('h-2.5 rounded-full transition-all duration-300', i === active ? 'w-7 bg-brand-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400')}
            />
          ))}
        </div>
        <button type="button" onClick={() => goTo(active + 1)} className={cx(arrow, 'md:hidden')} aria-label="Témoignage suivant"><ChevronRight className="size-5" /></button>
      </div>
    </section>
  )
}

export const NEWS_COVERS = ['bg-brand-700', 'bg-flame-500', 'bg-gold-500']

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

function FinalCta() {
  return (
    <section className="container-page pb-16">
      <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 to-brand-600 px-6 py-12 text-center text-white sm:px-12">
        <div className="animate-float pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-flame-500/30 blur-2xl" />
        <div className="animate-float pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-white/10 blur-2xl" style={{ '--delay': '2s' }} />
        <h2 className="relative text-2xl font-extrabold sm:text-4xl">Prêt à allumer votre avenir numérique ?</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-brand-100">Créez votre compte gratuitement et commencez votre première formation dès aujourd'hui.</p>
        <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/inscription" variant="white" size="lg" className="hover:-translate-y-0.5">Créer mon compte <ArrowRight className="arrow-slide size-5" /></Button>
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
      <Partners partners={partners} />
      <FinalCta />
    </>
  )
}
