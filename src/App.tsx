import { useEffect, useState } from 'react'
import { AuthPage } from './pages/AuthPage'
import { MindMapPage } from './pages/MindMapPage'
import { useAuthStore } from './stores/authStore'

const authRoutes = new Set(['/', '/auth'])
const workspaceRoutes = new Set(['/workspace', '/workspace/new'])

function getCurrentPath() {
  return window.location.pathname
}

function navigate(path: string, replace = false) {
  if (window.location.pathname === path) {
    return
  }

  if (replace) {
    window.history.replaceState(null, '', path)
  } else {
    window.history.pushState(null, '', path)
  }

  window.dispatchEvent(new PopStateEvent('popstate'))
}

function App() {
  const [path, setPath] = useState(getCurrentPath)
  const googleUser = useAuthStore((state) => state.googleUser)
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const isLoading = useAuthStore((state) => state.isLoading)

  useEffect(() => {
    let isMounted = true
    let cleanup: (() => void) | undefined

    void initializeAuth().then((unsubscribe) => {
      if (!isMounted) {
        unsubscribe()
        return
      }

      cleanup = unsubscribe
    })

    return () => {
      isMounted = false
      cleanup?.()
    }
  }, [initializeAuth])

  useEffect(() => {
    const handlePopState = () => setPath(getCurrentPath())
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!googleUser) {
      if (!authRoutes.has(path)) {
        navigate('/auth', true)
      }
      return
    }

    if (workspaceRoutes.has(path)) {
      return
    }

    navigate('/workspace', true)
  }, [googleUser, isLoading, path])

  if (isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel auth-panel-static">
          <h1>Markdown Maps</h1>
          <p>워크스페이스를 준비하고 있습니다.</p>
        </section>
      </main>
    )
  }

  if (!googleUser || authRoutes.has(path)) {
    return <AuthPage />
  }

  return <MindMapPage />
}

export default App
