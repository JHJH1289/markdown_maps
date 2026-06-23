import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../stores/authStore'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            callback: (response: { credential?: string }) => void
            client_id: string
          }) => void
          prompt: () => void
          renderButton: (
            element: HTMLElement,
            options: {
              shape?: string
              size?: string
              text?: string
              theme?: string
              type?: string
            },
          ) => void
        }
      }
    }
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services'
let googleScriptPromise: Promise<void> | null = null

function loadGoogleScript() {
  if (window.google) {
    return Promise.resolve()
  }

  if (googleScriptPromise) {
    return googleScriptPromise
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google sign-in.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.defer = true
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google sign-in.'))
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

export function GoogleSignInButton() {
  const buttonRef = useRef<HTMLDivElement | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const setGoogleCredential = useAuthStore((state) => state.setGoogleCredential)
  const isConfigured = useAuthStore((state) => state.isConfigured)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

    if (!isConfigured || !clientId || !buttonRef.current) {
      return
    }

    let isMounted = true

    setStatusMessage(null)

    void loadGoogleScript()
      .then(() => {
        if (!isMounted || !buttonRef.current || !window.google) {
          return
        }

        buttonRef.current.innerHTML = ''
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              setGoogleCredential(response.credential)
            }
          },
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          shape: 'rectangular',
          size: 'large',
          text: 'signin_with',
          theme: 'outline',
          type: 'standard',
        })
      })
      .catch(() => {
        if (isMounted) {
          setStatusMessage('Google 로그인 버튼을 불러오지 못했습니다.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [isConfigured, setGoogleCredential])

  if (!isConfigured) {
    return <span className="auth-status">Google env missing</span>
  }

  return (
    <div className="google-sign-in-wrap">
      <div className="google-sign-in" ref={buttonRef} />
      {statusMessage && <span className="auth-status">{statusMessage}</span>}
    </div>
  )
}
