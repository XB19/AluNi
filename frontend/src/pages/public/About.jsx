import { Eye, Flame, Handshake, Heart, Lightbulb, Target, Users } from 'lucide-react'
import { useApi } from '../../api/useApi'
import { fileUrl } from '../../api/client'
import { useAcademy, useSettings } from '../../context/SettingsContext'
import { Avatar, Button, SectionTitle } from '../../components/ui'
import { useStats } from './Home'
import logo from '../../assets/logo-cdej.jpg'

export default function About() {
  const academy = useAcademy()
  const s = useSettings()
  const stats = useStats()
  const trainers = useApi('/trainers').data ?? []
  const partners = useApi('/partners').data ?? []

  return (
    <>
      <section className="bg-brand-800 text-white">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-[1.3fr_1fr] lg:py-20">
          <div>
            <p className="mb-3 text-sm font-bold tracking-wide text-flame-400 uppercase">À propos de l'Académie</p>
            <h1 className="text-3xl leading-tight font-extrabold sm:text-5xl">Allumer la lumière du numérique dans la vie de chaque jeune</h1>
            <p className="mt-5 max-w-xl text-lg text-brand-100">
              L'{academy.name} (ALuNI) est une initiative du {academy.center}, centre {academy.code}. Elle forme les jeunes aux
              compétences numériques dans une salle informatique équipée, et désormais en ligne.
            </p>
          </div>
          <div className="mx-auto rounded-3xl bg-white p-6 shadow-2xl">
            <img src={logo} alt="Logo du CDEJ Lumière de Kpévé" className="size-56 object-contain sm:size-64" />
          </div>
        </div>
      </section>

      <section className="container-page grid gap-6 py-16 md:grid-cols-3">
        {[
          { icon: Target, title: 'Notre mission', text: s['about.mission'] },
          { icon: Eye, title: 'Notre vision', text: s['about.vision'] },
          { icon: Heart, title: 'Nos valeurs', text: s['about.values'] },
        ].map((b) => (
          <div key={b.title} className="rounded-2xl border border-gray-200 p-7">
            <span className="flex size-12 items-center justify-center rounded-xl bg-flame-50 text-flame-600"><b.icon className="size-6" /></span>
            <h2 className="mt-5 text-xl font-bold">{b.title}</h2>
            <p className="mt-2 leading-relaxed text-gray-700">{b.text}</p>
          </div>
        ))}
      </section>

      <section className="bg-gray-50 py-16">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionTitle eyebrow="Notre histoire" title="D'une salle informatique à une académie en ligne" />
            <div className="space-y-4 text-lg leading-relaxed text-gray-700">
              <p>Le CDEJ {academy.code} accompagne depuis des années les enfants et les jeunes de Kpévé et ses environs. Face à l'importance croissante du numérique, le centre a équipé une salle informatique dédiée à leur formation.</p>
              <p>Pour aller plus loin, l'Académie ouvre aujourd'hui sa plateforme aux jeunes des autres CDEJ et à toute personne souhaitant se former ou faire certifier ses compétences.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((st) => (
              <div key={st.label} className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-extrabold text-brand-700">{st.value}</p>
                <p className="mt-1 text-sm text-gray-600">{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {trainers.length > 0 && (
        <section className="container-page py-16">
          <SectionTitle eyebrow="L'équipe" title="Les formateurs de l'Académie" subtitle="Des professionnels passionnés, validés par l'Académie." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trainers.map((t) => (
              <div key={t.id} className="rounded-2xl border border-gray-200 p-6 text-center">
                <Avatar name={t.name} src={fileUrl(t.photo)} size="xl" className="mx-auto" />
                <p className="mt-4 font-bold">{t.name}</p>
                {t.title && <p className="text-sm text-brand-700">{t.title}</p>}
                {t.bio && <p className="mt-3 text-sm text-gray-600">{t.bio}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-flame-50 py-16">
        <div className="container-page">
          <SectionTitle eyebrow="Ce qui nous guide" title="Notre approche pédagogique" />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Lightbulb, title: 'Apprendre en faisant', text: 'Chaque notion est suivie d’un exercice pratique.' },
              { icon: Users, title: 'Pour tous les niveaux', text: 'On part de zéro : aucune connaissance préalable n’est exigée pour débuter.' },
              { icon: Flame, title: 'Encourager', text: 'Petites victoires, progression visible et certificats qui valorisent les efforts.' },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl bg-white p-6">
                <b.icon className="size-7 text-flame-500" />
                <h3 className="mt-3 text-lg font-bold">{b.title}</h3>
                <p className="mt-1 text-gray-600">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <SectionTitle center eyebrow="Partenaires" title="Ils nous accompagnent" />
        <div className="flex flex-wrap justify-center gap-3">
          {partners.map((p) => (
            <a key={p.id} href={p.website || undefined} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-4 font-bold text-gray-600">
              {p.logo ? <img src={fileUrl(p.logo)} alt="" className="h-8 object-contain" /> : <Handshake className="size-5 text-brand-600" />}
              {p.name}
            </a>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button to="/contact" variant="outline">Devenir partenaire</Button>
        </div>
      </section>
    </>
  )
}
