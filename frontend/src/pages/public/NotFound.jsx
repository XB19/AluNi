import { Compass } from 'lucide-react'
import { Button } from '../../components/ui'

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <Compass className="size-14 text-brand-500" />
      <h1 className="mt-5 text-3xl font-extrabold">Page introuvable</h1>
      <p className="mt-2 max-w-md text-gray-600">La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <div className="mt-7 flex gap-3">
        <Button to="/">Retour à l'accueil</Button>
        <Button to="/formations" variant="outline">Voir les formations</Button>
      </div>
    </div>
  )
}
