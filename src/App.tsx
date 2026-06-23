import { useEffect } from 'react'
import { LoginPage } from './components/LoginPage'
import { MindMapPage } from './pages/MindMapPage'
import { useAuthStore } from './stores/authStore'
import { useMindMapStore } from './stores/mindmapStore'

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const isLoading = useAuthStore((state) => state.isLoading)
  const user = useAuthStore((state) => state.user)
  const setActiveOwner = useMindMapStore((state) => state.setActiveOwner)

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
    void setActiveOwner(user?.id ?? null)
  }, [setActiveOwner, user?.id])

  if (isLoading) {
    return (
      <main className="auth-shell">
        <div className="auth-panel auth-panel-static">
          <h1>Markdown Maps</h1>
          <p>{'\uc138\uc158\uc744 \ud655\uc778\ud558\ub294 \uc911\uc785\ub2c8\ub2e4.'}</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <MindMapPage />
}

export default App
