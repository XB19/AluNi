import { createContext, useContext } from 'react'
import { useApi } from '../api/useApi'

// Valeurs utilisées tant que les paramètres du serveur ne sont pas chargés
const FALLBACK = {
  'academy.short': 'ALuNI',
  'academy.name': "Académie Lumière du Numérique et de l'Innovation",
  'academy.center': 'CDEJ Lumière de Kpévé',
  'academy.code': 'TG0157',
  'academy.city': 'Kpévé, Togo',
  'contact.phone': '',
  'contact.whatsapp': '',
  'contact.email': '',
  'contact.hours': '',
}

const SettingsContext = createContext(FALLBACK)

/** Paramètres du site vitrine modifiables par l'administrateur (textes, chiffres clés, coordonnées). */
export function SettingsProvider({ children }) {
  const { data, reload } = useApi('/site/settings')
  const settings = { ...FALLBACK, ...(data ?? {}) }
  return <SettingsContext.Provider value={{ ...settings, reload }}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)

/** Coordonnées et identité de l'Académie, sous une forme pratique pour l'affichage. */
export function useAcademy() {
  const s = useSettings()
  return {
    short: s['academy.short'],
    name: s['academy.name'],
    center: s['academy.center'],
    code: s['academy.code'],
    city: s['academy.city'],
    phone: s['contact.phone'],
    whatsapp: s['contact.whatsapp'],
    email: s['contact.email'],
    address: s['contact.address'],
    hours: s['contact.hours'],
    facebook: s['contact.facebook'],
    youtube: s['contact.youtube'],
    mapLat: s['contact.mapLat'],
    mapLng: s['contact.mapLng'],
  }
}
