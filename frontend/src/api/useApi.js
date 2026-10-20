import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './client'

/**
 * Charge une ressource GET de l'API.
 * Renvoie { data, error, loading, reload, setData }. Passer path = null pour ne rien charger.
 */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path })
  const [version, setVersion] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false })
      return
    }
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .get(path, { signal: controller.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false })
      })
    return () => controller.abort()
  }, [path, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const setData = useCallback((updater) => {
    if (!mounted.current) return
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
  }, [])

  return { ...state, reload, setData }
}
