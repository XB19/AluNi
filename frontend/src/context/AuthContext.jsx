import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from '../api/client'
import { readStore, writeStore } from './storage'

const AuthContext = createContext(null)

export const HOME_BY_ROLE = { apprenant: '/apprenant', formateur: '/formateur', admin: '/admin' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? readStore('aluni-user', null) : null))

  const save = useCallback((u) => {
    setUser(u)
    writeStore('aluni-user', u)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    save(null)
  }, [save])

  // Session expirée côté serveur
  useEffect(() => {
    const onLogout = () => save(null)
    window.addEventListener('aluni:logout', onLogout)
    return () => window.removeEventListener('aluni:logout', onLogout)
  }, [save])

  // Rafraîchit le profil au chargement (statut, rôle, photo à jour)
  useEffect(() => {
    if (getToken()) api.get('/auth/me').then(save).catch(() => {})
  }, [save])

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password })
    setToken(res.token)
    save(res.user)
    return res.user
  }

  /** Renvoie { pending: true } pour une demande formateur, sinon connecte l'utilisateur. */
  const register = async (data) => {
    const res = await api.post('/auth/register', data)
    if (res.token) {
      setToken(res.token)
      save(res.user)
    }
    return res
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser: save }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
