import { create } from 'zustand'

export const GOOGLE_TOKEN_STORAGE_KEY = 'markdown-maps:google-id-token'
const GOOGLE_USER_STORAGE_KEY = 'markdown-maps:google-user'

type AuthMode = 'sign-in' | 'sign-up'

export type GoogleUser = {
  email: string
  id: string
  name: string
  picture?: string
}

type AuthState = {
  errorMessage: string | null
  googleIdToken: string | null
  googleUser: GoogleUser | null
  isConfigured: boolean
  isLoading: boolean
  isSubmitting: boolean
  initializeAuth: () => Promise<() => void>
  setGoogleCredential: (credential: string) => void
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  submitPasswordAuth: (
    mode: AuthMode,
    email: string,
    password: string,
  ) => Promise<void>
}

function decodeGoogleCredential(credential: string): GoogleUser {
  const [, payload] = credential.split('.')

  if (!payload) {
    throw new Error('Google credential payload is missing.')
  }

  const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
  const decodedPayload = JSON.parse(
    window.atob(
      normalizedPayload.padEnd(
        normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
        '=',
      ),
    ),
  ) as {
    email?: string
    name?: string
    picture?: string
    sub?: string
  }

  if (!decodedPayload.sub || !decodedPayload.email) {
    throw new Error('Google credential is missing user information.')
  }

  return {
    email: decodedPayload.email,
    id: decodedPayload.sub,
    name: decodedPayload.name ?? decodedPayload.email,
    picture: decodedPayload.picture,
  }
}

function loadStoredGoogleUser() {
  const rawUser = window.localStorage.getItem(GOOGLE_USER_STORAGE_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as GoogleUser
  } catch {
    window.localStorage.removeItem(GOOGLE_USER_STORAGE_KEY)
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  errorMessage: null,
  googleIdToken: null,
  googleUser: null,
  isConfigured: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
  isLoading: true,
  isSubmitting: false,

  initializeAuth: async () => {
    set({
      googleIdToken: window.localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY),
      googleUser: loadStoredGoogleUser(),
      isLoading: false,
    })

    return () => undefined
  },

  setGoogleCredential: (credential) => {
    try {
      const googleUser = decodeGoogleCredential(credential)
      window.localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, credential)
      window.localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(googleUser))
      set({ errorMessage: null, googleIdToken: credential, googleUser })
    } catch (error) {
      set({
        errorMessage:
          error instanceof Error
            ? error.message
            : '\ub85c\uadf8\uc778 \uc815\ubcf4\ub97c \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.',
      })
    }
  },

  signInWithPassword: async () => {
    set({ errorMessage: 'Google \ub85c\uadf8\uc778\uc744 \uc0ac\uc6a9\ud558\uc138\uc694.' })
  },

  signOut: async () => {
    window.localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(GOOGLE_USER_STORAGE_KEY)
    set({ errorMessage: null, googleIdToken: null, googleUser: null })
  },

  submitPasswordAuth: async () => {
    set({ errorMessage: 'Google \ub85c\uadf8\uc778\uc744 \uc0ac\uc6a9\ud558\uc138\uc694.' })
  },
}))
