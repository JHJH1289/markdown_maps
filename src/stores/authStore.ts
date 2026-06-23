import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '../api/supabaseClient'

type AuthMode = 'sign-in' | 'sign-up'

type AuthState = {
  errorMessage: string | null
  isConfigured: boolean
  isLoading: boolean
  isSubmitting: boolean
  session: Session | null
  user: User | null
  initializeAuth: () => Promise<() => void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  submitPasswordAuth: (
    mode: AuthMode,
    email: string,
    password: string,
  ) => Promise<void>
}

function toAuthMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '\uc694\uccad\uc744 \ucc98\ub9ac\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.'
}

export const useAuthStore = create<AuthState>((set, get) => ({
  errorMessage: null,
  isConfigured: isSupabaseConfigured,
  isLoading: true,
  isSubmitting: false,
  session: null,
  user: null,

  initializeAuth: async () => {
    if (!supabase) {
      set({ isLoading: false })
      return () => undefined
    }

    const { data, error } = await supabase.auth.getSession()

    if (error) {
      set({
        errorMessage: toAuthMessage(error),
        isLoading: false,
        session: null,
        user: null,
      })
    } else {
      set({
        errorMessage: null,
        isLoading: false,
        session: data.session,
        user: data.session?.user ?? null,
      })
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        errorMessage: null,
        session,
        user: session?.user ?? null,
      })
    })

    return () => listener.subscription.unsubscribe()
  },

  signInWithPassword: async (email, password) => {
    await get().submitPasswordAuth('sign-in', email, password)
  },

  signOut: async () => {
    if (!supabase) {
      return
    }

    set({ errorMessage: null, isSubmitting: true })
    const { error } = await supabase.auth.signOut()
    set({ errorMessage: error ? toAuthMessage(error) : null, isSubmitting: false })
  },

  submitPasswordAuth: async (mode, email, password) => {
    if (!supabase) {
      set({
        errorMessage:
          'Supabase \ud658\uacbd \ubcc0\uc218\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.',
      })
      return
    }

    set({ errorMessage: null, isSubmitting: true })

    const authRequest =
      mode === 'sign-up'
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password })
    const { error } = await authRequest

    set({
      errorMessage: error ? toAuthMessage(error) : null,
      isSubmitting: false,
    })
  },
}))
