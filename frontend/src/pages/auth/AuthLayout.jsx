import { Link } from 'react-router'
import { Award, CheckCircle2, Smartphone, Users } from 'lucide-react'
import { Logo } from '../../components/CourseCard'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-20 -bottom-20 size-96 rounded-full bg-flame-500/20 blur-3xl" />
        <Link to="/" className="relative"><Logo light /></Link>
        <div className="relative my-auto max-w-md">
          <h2 className="text-4xl leading-tight font-extrabold">Votre avenir numérique commence ici.</h2>
          <ul className="mt-8 space-y-5">
            {[
              { icon: CheckCircle2, text: 'Des formations pratiques, du niveau débutant au niveau avancé' },
              { icon: Smartphone, text: 'Apprenez sur ordinateur ou sur téléphone, à votre rythme' },
              { icon: Award, text: 'Des certificats reconnus et vérifiables en ligne' },
              { icon: Users, text: "L'accompagnement des formateurs de l'Académie" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-lg text-brand-50"><Icon className="mt-1 size-5 shrink-0 text-flame-400" />{text}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-200">© 2026 ALuNI – CDEJ TG0157, Kpévé</p>
      </aside>
      <main className="flex flex-col px-4 py-6 sm:px-10">
        <Link to="/" className="lg:hidden"><Logo /></Link>
        <div className="mx-auto my-auto w-full max-w-md py-10">
          <h1 className="text-[28px] font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-gray-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
