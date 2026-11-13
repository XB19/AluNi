import { cx } from './ui'
import buildingJpg from '../assets/aluni-batiment.jpg'
import buildingWebp from '../assets/aluni-batiment.webp'

// Voiles bleus posés sur la photo : le texte blanc reste parfaitement lisible
const VEILS = {
  // Sections bleu nuit (« Pour qui ? », témoignages, pied de page…) : photo discrète
  deep: 'bg-gradient-to-r from-brand-950/95 via-brand-900/90 to-brand-900/78',
  // Grands bandeaux (À propos, connexion) : la photo se devine davantage
  hero: 'bg-gradient-to-r from-brand-950/92 via-brand-900/82 to-brand-800/65',
  // Cartes d'appel à l'action, d'un bleu plus clair
  bright: 'bg-gradient-to-r from-brand-800/92 via-brand-700/85 to-brand-600/80',
}

/**
 * Photo du bâtiment de l'Académie en fond d'une section bleue, teintée aux couleurs du site.
 * À placer en premier enfant d'un conteneur « relative overflow-hidden » ; le contenu passe au-dessus (« relative »).
 */
export default function Backdrop({ tone = 'deep', position = 'center 40%', className }) {
  return (
    <div className={cx('pointer-events-none absolute inset-0', className)} aria-hidden>
      <picture>
        <source type="image/webp" srcSet={buildingWebp} />
        <img src={buildingJpg} alt="" loading="lazy" decoding="async" width="1188" height="555"
          className="size-full object-cover grayscale-[85%] contrast-110" style={{ objectPosition: position }} />
      </picture>
      <div className={cx('absolute inset-0', VEILS[tone])} />
    </div>
  )
}
