import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthStore } from '../stores/authStore'

const text = {
  buttonSignIn: '\ub85c\uadf8\uc778',
  buttonSignUp: '\uacc4\uc815 \ub9cc\ub4e4\uae30',
  email: '\uc774\uba54\uc77c',
  missingConfig:
    'VITE_SUPABASE_URL\uacfc VITE_SUPABASE_ANON_KEY\ub97c \uc124\uc815\ud558\uba74 \ub85c\uadf8\uc778\uc744 \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.',
  password: '\ube44\ubc00\ubc88\ud638',
  signIn: '\ub85c\uadf8\uc778',
  signUp: '\ud68c\uc6d0\uac00\uc785',
  subtitle: '\ub85c\uadf8\uc778\ud558\uba74 \ub9c8\uc778\ub4dc\ub9f5\uc774 Supabase\uc5d0 \uc800\uc7a5\ub429\ub2c8\ub2e4.',
  title: 'Markdown Maps',
}

export function LoginPage() {
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const errorMessage = useAuthStore((state) => state.errorMessage)
  const isConfigured = useAuthStore((state) => state.isConfigured)
  const isSubmitting = useAuthStore((state) => state.isSubmitting)
  const submitPasswordAuth = useAuthStore((state) => state.submitPasswordAuth)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitPasswordAuth(authMode, email.trim(), password)
  }

  return (
    <main className="auth-shell">
      <form className="auth-panel" onSubmit={handleSubmit}>
        <div>
          <h1>{text.title}</h1>
          <p>{isConfigured ? text.subtitle : text.missingConfig}</p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            aria-selected={authMode === 'sign-in'}
            onClick={() => setAuthMode('sign-in')}
            role="tab"
            type="button"
          >
            {text.signIn}
          </button>
          <button
            aria-selected={authMode === 'sign-up'}
            onClick={() => setAuthMode('sign-up')}
            role="tab"
            type="button"
          >
            {text.signUp}
          </button>
        </div>

        <label className="auth-field">
          <span>{text.email}</span>
          <input
            autoComplete="email"
            disabled={!isConfigured || isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="auth-field">
          <span>{text.password}</span>
          <input
            autoComplete={
              authMode === 'sign-up' ? 'new-password' : 'current-password'
            }
            disabled={!isConfigured || isSubmitting}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}

        <button
          className="auth-submit"
          disabled={!isConfigured || isSubmitting}
          type="submit"
        >
          {authMode === 'sign-in' ? text.buttonSignIn : text.buttonSignUp}
        </button>
      </form>
    </main>
  )
}
