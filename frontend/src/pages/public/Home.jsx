import { useState } from 'react'
import { Link } from 'react-router'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowRight, Award, BadgeCheck, BookOpen, Building2, CheckCircle2, ClipboardCheck, GraduationCap, Heart,
  Laptop, Lightbulb, Quote, ShieldCheck, Smartphone, Sparkles, User, UserPlus, Users, WifiOff,
} from 'lucide-react'
import { TESTIMONIALS, formatDate } from '../../data/constants'
import { useApi } from '../../api/useApi'
import { fileUrl } from '../../api/client'
import { useAcademy, useSettings } from '../../context/SettingsContext'
import { CategoryIcon, CourseCard } from '../../components/CourseCard'
import { Avatar, Badge, Button, cx, ProgressBar, SectionTitle } from '../../components/ui'
import logo from '../../assets/logo-cdej.jpg'

export function useStats() {
  const s = useSettings()
  return [
    { value: s['stats.learners'], label: 'jeunes formés' },
    { value: s['stats.courses'], label: 'formations disponibles' },
    { value: s['stats.certificates'], label: 'certificats délivrés' },
    { value: s['stats.computers'], label: 'ordinateurs en salle' },
  ]
}

function Hero() {
  const s = useSettings()
  const academy = useAcademy()
  const [first, ...rest] = (s['home.heroTitle'] ?? '').split('. ')
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="pointer-events-none absolute -top-24 -right-24 size-[420px] rounded-full bg-flame-100/60 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-32 size-[360px] rounded-full bg-brand-100/70 blur-3xl" />
      <div className="container-page relative grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <Badge tone="green" className="mb-5 py-1 text-[13px]">
            <Sparkles className="size-3.5" /> CDEJ {academy.code} · {academy.city}
          </Badge>
          <h1 className="text-[34px] leading-[1.1] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[56px]">
            {rest.length ? (
              <>
                {first}.
                <br />
                <span className="text-brand-600">{rest.join('. ')}</span>
              </>
            ) : (
              first
            )}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-700">{s['home.heroSubtitle']}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button to="/inscription" size="lg">Commencer gratuitement <ArrowRight className="size-5" /></Button>
            <Button to="/formations" size="lg" variant="outline-gray">Voir les formations</Button>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['Essi A', 'Komlan D', 'Afi M', 'Kodjo L'].map((n) => (
                <Avatar key={n} name={n} size="sm" className="ring-2 ring-white" />
              ))}
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-bold text-ink">{s['stats.learners']} jeunes</span> déjà formés à l'Académie
            </p>
          </div>
        </div>

        {/* Composition visuelle */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 shadow-2xl sm:p-8">
            <div className="flex items-center gap-4">
              <img src={logo} alt="" className="size-16 rounded-2xl bg-white object-contain p-1" />
              <div className="text-white">
                <p className="text-sm text-brand-100">Bienvenue à</p>
                <p className="text-2xl font-extrabold">ALuNI</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold text-gray-500">Formation en cours</p>
              <p className="mt-0.5 font-bold">Initiation à l'informatique</p>
              <ProgressBar value={64} className="mt-3" showLabel />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {[['3', 'modules'], ['12', 'leçons'], ['20 h', 'de cours']].map(([v, l]) => (
                  <div key={l} className="rounded-lg bg-gray-50 py-2"><p className="text-base font-extrabold text-brand-700">{v}</p>{l}</div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-white">
              <Laptop className="size-5 shrink-0" />
              <p className="text-sm">Salle informatique équipée de {s['stats.computers']} postes à Kpévé</p>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl bg-white p-3 pr-5 shadow-xl sm:-left-10">
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-100 text-brand-700"><CheckCircle2 className="size-5" /></span>
            <div>
              <p className="text-xs text-gray-500">Examen final</p>
              <p className="text-sm font-bold">Admis · 86 / 100</p>
            </div>
          </div>
          <div className="absolute -top-5 -right-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl sm:-right-8">
            <QRCodeSVG value={`${window.location.origin}/verifier`} size={44} fgColor="#16592b" />
            <div className="pr-2">
              <p className="text-xs text-gray-500">Certificat</p>
              <p className="flex items-center gap-1 text-sm font-bold text-brand-700"><BadgeCheck className="size-4" /> Vérifié</p>
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
        {stats.map((s) => (
          <div key={s.label} className="text-center lg:border-r lg:border-gray-100 lg:last:border-0">
            <p className="text-3xl font-extrabold text-brand-700 sm:text-4xl">{s.value}</p>
            <p className="mt-1 text-sm text-gray-600">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Categories({ categories }) {
  return (
    <section className="container-page py-16">
      <SectionTitle eyebrow="Explorer" title="Choisissez votre domaine" subtitle="Des parcours pensés pour débuter, progresser et trouver un emploi." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/formations?categorie=${c.id}`}
            className="group flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-5"
          >
            <span className={cx('flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm sm:size-14', c.color)}>
              <CategoryIcon icon={c.icon} className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block leading-snug font-bold text-ink group-hover:text-brand-700">{c.name}</span>
              <span className="text-sm text-gray-500">{c.count} formation{c.count > 1 ? 's' : ''}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function PopularCourses({ courses, categories }) {
  const [tab, setTab] = useState('all')
  const list = (tab === 'all' ? courses.filter((c) => c.popular || c.isNew) : courses.filter((c) => c.category === tab)).slice(0, 4)
  return (
    <section className="bg-gray-50 py-16">
      <div className="container-page">
        <SectionTitle
          eyebrow="Formations"
          title="Les formations les plus suivies"
          action={<Link to="/formations" className="flex items-center gap-1 font-bold text-brand-700 hover:underline">Tout voir <ArrowRight className="size-4" /></Link>}
        />
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
          {[{ id: 'all', name: 'Populaires' }, ...categories.filter((c) => c.count > 0)].map((c) => (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={cx(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition',
                tab === c.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((c) => <CourseCard key={c.slug} course={c} />)}
        </div>
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
      <SectionTitle center eyebrow="Comment ça marche" title="De l'inscription au certificat, en 4 étapes" />
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl border border-gray-200 bg-white p-6">
            <span className="absolute top-5 right-5 text-4xl font-extrabold text-gray-100">0{i + 1}</span>
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white"><s.icon className="size-6" /></span>
            <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
            <p className="mt-1.5 text-gray-600">{s.text}</p>
          </li>
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
    <section className="bg-brand-900 py-16 text-white">
      <div className="container-page">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-bold tracking-wide text-flame-400 uppercase">Pour qui ?</p>
          <h2 className="text-2xl font-extrabold sm:text-3xl">Une académie ouverte à tous ceux qui veulent apprendre</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <Link key={it.title} to={it.to} className="group rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:bg-white/10">
              <it.icon className="size-8 text-flame-400" />
              <h3 className="mt-4 text-lg font-bold">{it.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-brand-100">{it.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white group-hover:underline">
                Commencer <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function Certification() {
  return (
    <section className="container-page grid items-center gap-12 py-16 lg:grid-cols-2">
      <div className="order-2 lg:order-1">
        {/* Aperçu de certificat */}
        <div className="relative mx-auto max-w-lg rotate-[-2deg] rounded-2xl border-[6px] border-gold-400 bg-white p-6 shadow-2xl sm:p-8">
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
      </div>
      <div className="order-1 lg:order-2">
        <p className="mb-2 text-sm font-bold tracking-wide text-flame-600 uppercase">Certification</p>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Des certificats infalsifiables, vérifiables en un scan</h2>
        <p className="mt-4 text-lg text-gray-700">Chaque certificat porte un numéro unique, une signature numérique et un QR code. Un employeur peut confirmer son authenticité en quelques secondes.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-gold-100 p-5">
            <BookOpen className="size-6 text-gold-700" />
            <h3 className="mt-3 font-bold">Attestation de suivi</h3>
            <p className="mt-1 text-sm text-gray-700">Vous avez terminé toutes les leçons de la formation.</p>
          </div>
          <div className="rounded-2xl bg-brand-50 p-5">
            <ShieldCheck className="size-6 text-brand-700" />
            <h3 className="mt-3 font-bold">Certificat de compétence</h3>
            <p className="mt-1 text-sm text-gray-700">Vous avez réussi l'examen final de la formation.</p>
          </div>
        </div>
        <Button to="/verifier" variant="outline" className="mt-7"><BadgeCheck className="size-5" /> Vérifier un certificat</Button>
      </div>
    </section>
  )
}

function Vision() {
  const academy = useAcademy()
  const s = useSettings()
  return (
    <section className="bg-flame-50 py-16">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="mb-2 text-sm font-bold tracking-wide text-flame-600 uppercase">Notre vision</p>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Que chaque jeune devienne une lumière grâce au numérique</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-700">
            Né au sein du {academy.center}, ALuNI veut donner à chaque jeune les compétences numériques pour réussir ses
            études, trouver un emploi ou créer son activité. {s['about.vision']}
          </p>
          <Button to="/a-propos" variant="flame" className="mt-7">Découvrir l'Académie <ArrowRight className="size-4" /></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: Lightbulb, title: 'Apprendre en pratiquant', text: 'Des exercices concrets dans chaque module, en salle ou à la maison.' },
            { icon: Smartphone, title: 'Accessible partout', text: 'La plateforme fonctionne sur tous les téléphones, même avec une connexion modeste.' },
            { icon: WifiOff, title: 'Rien ne se perd', text: 'Progression et réponses enregistrées automatiquement, même en cas de coupure.' },
            { icon: Users, title: 'Accompagnement humain', text: "Des formateurs présents à l'Académie pour vous aider et vous encourager." },
          ].map((v) => (
            <div key={v.title} className="rounded-2xl bg-white p-5 shadow-sm">
              <v.icon className="size-6 text-flame-500" />
              <h3 className="mt-3 font-bold">{v.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{v.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="container-page py-16">
      <SectionTitle center eyebrow="Témoignages" title="Ils ont appris avec ALuNI" />
      <div className="grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6">
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
    </section>
  )
}

export const NEWS_COVERS = ['bg-brand-700', 'bg-flame-500', 'bg-gold-500']

export function NewsCover({ item, index, className }) {
  const image = fileUrl(item.image)
  return (
    <div className={cx('relative flex items-end overflow-hidden p-4', !image && NEWS_COVERS[index % 3], className)}>
      {image && <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
      {item.category && <Badge className="relative bg-white text-ink">{item.category}</Badge>}
    </div>
  )
}

function LatestNews({ news }) {
  if (!news.length) return null
  return (
    <section className="bg-gray-50 py-16">
      <div className="container-page">
        <SectionTitle
          eyebrow="Actualités"
          title="La vie de l'Académie"
          action={<Link to="/actualites" className="flex items-center gap-1 font-bold text-brand-700 hover:underline">Toutes les actualités <ArrowRight className="size-4" /></Link>}
        />
        <div className="grid gap-5 md:grid-cols-3">
          {news.slice(0, 3).map((n, i) => (
            <Link key={n.slug} to={`/actualites/${n.slug}`} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-md">
              <NewsCover item={n} index={i} className="aspect-[16/8]" />
              <div className="p-5">
                <p className="text-sm text-gray-500">{formatDate(n.date)}</p>
                <h3 className="mt-1 text-lg leading-snug font-bold group-hover:text-brand-700">{n.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">{n.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function Partners({ partners }) {
  if (!partners.length) return null
  return (
    <section className="container-page py-12">
      <p className="mb-6 text-center text-sm font-semibold text-gray-500">Avec le soutien de nos partenaires</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {partners.map((p) =>
          p.logo ? (
            <img key={p.id} src={fileUrl(p.logo)} alt={p.name} className="h-12 rounded-lg object-contain" />
          ) : (
            <span key={p.id} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-500">{p.name}</span>
          ),
        )}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="container-page pb-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 to-brand-600 px-6 py-12 text-center text-white sm:px-12">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-flame-500/30 blur-2xl" />
        <h2 className="relative text-2xl font-extrabold sm:text-4xl">Prêt à allumer votre avenir numérique ?</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-brand-100">Créez votre compte gratuitement et commencez votre première formation dès aujourd'hui.</p>
        <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to="/inscription" variant="white" size="lg">Créer mon compte</Button>
          <Button to="/contact" size="lg" className="bg-white/10 ring-1 ring-white/30 hover:bg-white/20">Nous contacter</Button>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const categories = useApi('/categories').data ?? []
  const courses = useApi('/courses').data ?? []
  const news = useApi('/news').data ?? []
  const partners = useApi('/partners').data ?? []
  return (
    <>
      <Hero />
      <Stats />
      <Categories categories={categories} />
      {courses.length > 0 && <PopularCourses courses={courses} categories={categories} />}
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
