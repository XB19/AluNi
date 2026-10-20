import { useState } from 'react'
import { CheckCircle2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { api } from '../../api/client'
import { useAcademy } from '../../context/SettingsContext'
import { Button, Field, FormError } from '../../components/ui'
import { WhatsAppIcon } from '../../components/BrandIcons'

const EMPTY = { name: '', phone: '', email: '', subject: 'Informations sur une formation', message: '' }

export default function Contact() {
  const academy = useAcademy()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [f, setF] = useState(EMPTY)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/contact', f)
      setSent(true)
      setF(EMPTY)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const lat = Number(academy.mapLat) || 6.73
  const lng = Number(academy.mapLng) || 1.1
  const bbox = [lng - 0.07, lat - 0.05, lng + 0.07, lat + 0.05].map((n) => n.toFixed(3)).join('%2C')

  return (
    <>
      <section className="bg-brand-50">
        <div className="container-page py-12">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Contactez-nous</h1>
          <p className="mt-2 max-w-xl text-lg text-gray-700">Une question sur une formation, une inscription ou un certificat ? Notre équipe vous répond.</p>
        </div>
      </section>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {academy.whatsapp && (
            <a href={`https://wa.me/${academy.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl bg-[#25D366] p-5 text-white transition hover:brightness-95">
              <WhatsAppIcon className="size-8 shrink-0" />
              <span>
                <span className="block font-bold">Écrivez-nous sur WhatsApp</span>
                <span className="text-sm text-white/90">Réponse rapide, du lundi au samedi</span>
              </span>
            </a>
          )}
          {[
            { icon: Phone, label: 'Téléphone', value: academy.phone, href: academy.phone && `tel:${academy.phone.replace(/\s/g, '')}` },
            { icon: Mail, label: 'E-mail', value: academy.email, href: academy.email && `mailto:${academy.email}` },
            { icon: MapPin, label: 'Adresse', value: academy.address },
            { icon: Clock, label: 'Horaires de la salle', value: academy.hours },
          ].filter((c) => c.value).map((c) => (
            <div key={c.label} className="flex items-start gap-4 rounded-2xl border border-gray-200 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><c.icon className="size-5" /></span>
              <div>
                <p className="text-sm text-gray-500">{c.label}</p>
                {c.href ? <a href={c.href} className="font-bold hover:text-brand-700">{c.value}</a> : <p className="font-bold">{c.value}</p>}
              </div>
            </div>
          ))}
          <iframe
            title="Carte – Kpévé, Togo"
            className="h-64 w-full rounded-2xl border border-gray-200"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 p-6 sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center py-16 text-center">
              <CheckCircle2 className="size-14 text-brand-600" />
              <h2 className="mt-4 text-2xl font-bold">Message envoyé !</h2>
              <p className="mt-2 text-gray-600">Merci, nous vous répondrons dans les plus brefs délais.</p>
              <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>Envoyer un autre message</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
              <h2 className="text-xl font-bold sm:col-span-2">Envoyer un message</h2>
              <Field label="Nom complet" error={error?.fields?.name}><input required value={f.name} onChange={set('name')} className="input" placeholder="Ex. : Afi Mensah" /></Field>
              <Field label="Téléphone"><input type="tel" value={f.phone} onChange={set('phone')} className="input" placeholder="90 00 00 00" /></Field>
              <Field label="E-mail (facultatif)" className="sm:col-span-2" error={error?.fields?.email}><input type="email" value={f.email} onChange={set('email')} className="input" placeholder="vous@exemple.com" /></Field>
              <Field label="Objet" className="sm:col-span-2">
                <select value={f.subject} onChange={set('subject')} className="input">
                  <option>Informations sur une formation</option>
                  <option>Inscription / compte</option>
                  <option>Certificat</option>
                  <option>Devenir formateur</option>
                  <option>Partenariat</option>
                  <option>Autre</option>
                </select>
              </Field>
              <Field label="Message" className="sm:col-span-2" error={error?.fields?.message}><textarea required rows={5} value={f.message} onChange={set('message')} className="input" placeholder="Écrivez votre message…" /></Field>
              <div className="sm:col-span-2"><FormError error={error && !Object.keys(error.fields ?? {}).length ? error : null} /></div>
              <Button type="submit" disabled={busy} className="sm:col-span-2 sm:justify-self-start"><Send className="size-4" />{busy ? 'Envoi…' : 'Envoyer le message'}</Button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
