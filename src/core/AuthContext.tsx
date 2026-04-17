import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { devWarn } from '@/common/utils/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string
  firstName: string
  lastName: string
}

type AuthState = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  loginModalOpen: boolean
  /** True when the user is authenticated AND whitelisted. */
  canContribute: boolean
}

type AuthActions = {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  /** Returns true if the user can contribute. Opens login modal if not authenticated. */
  requireAuth: () => boolean
  closeLoginModal: () => void
  updateProfile: (firstName: string, lastName: string) => Promise<{ error: string | null }>
}

// ── Contexts ──────────────────────────────────────────────────────────────────

const AuthStateContext = createContext<AuthState | null>(null)
const AuthActionsContext = createContext<AuthActions | null>(null)

// ── Helpers ───────────────────────────────────────────────────────────────────

async function checkWhitelist(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_email_whitelisted', {
    check_email: email,
  })
  // Fail closed: an unknown whitelist state must not grant write access.
  if (error) {
    devWarn('[auth] checkWhitelist failed', error)
    return false
  }
  return data === true
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    devWarn('[auth] loadProfile failed', error)
    return null
  }
  if (!data) return null
  return { id: data.id, firstName: data.first_name, lastName: data.last_name }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [canContribute, setCanContribute] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  // Load whitelist status + profile when session changes
  useEffect(() => {
    let cancelled = false

    async function resolve(s: Session | null) {
      if (!s?.user) {
        setProfile(null)
        setCanContribute(false)
        setLoading(false)
        return
      }
      const email = s.user.email ?? ''
      const [whitelisted, prof] = await Promise.all([
        checkWhitelist(email),
        loadProfile(s.user.id),
      ])
      if (cancelled) return
      setCanContribute(whitelisted)
      setProfile(prof)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) devWarn('[auth] getSession failed', error)
      setSession(s)
      resolve(s)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s)
        if (s) {
          setLoginModalOpen(false)
          resolve(s)
        } else {
          setProfile(null)
          setCanContribute(false)
        }
      },
    )
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const whitelisted = await checkWhitelist(email)
    if (!whitelisted) {
      return { error: 'Cette adresse email n\'est pas autorisée à contribuer.' }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const whitelisted = await checkWhitelist(email)
    if (!whitelisted) {
      return { error: 'Cette adresse email n\'est pas autorisée. Contactez un administrateur.' }
    }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) devWarn('[auth] signOut failed', error)
  }, [])

  const closeLoginModal = useCallback(() => setLoginModalOpen(false), [])

  const requireAuth = useCallback(() => {
    if (session && canContribute) return true
    setLoginModalOpen(true)
    return false
  }, [session, canContribute])

  const updateProfile = useCallback(async (firstName: string, lastName: string) => {
    const userId = session?.user?.id
    if (!userId) return { error: 'Non connecté' }

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
    })
    if (error) return { error: error.message }

    setProfile({ id: userId, firstName, lastName })
    return { error: null }
  }, [session])

  const state = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      loginModalOpen,
      canContribute,
    }),
    [session, profile, loading, loginModalOpen, canContribute],
  )

  const actions = useMemo<AuthActions>(
    () => ({ signIn, signUp, signOut, requireAuth, closeLoginModal, updateProfile }),
    [signIn, signUp, signOut, requireAuth, closeLoginModal, updateProfile],
  )

  return (
    <AuthActionsContext.Provider value={actions}>
      <AuthStateContext.Provider value={state}>
        {children}
      </AuthStateContext.Provider>
    </AuthActionsContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAuthState() {
  const ctx = useContext(AuthStateContext)
  if (!ctx) throw new Error('useAuthState must be inside <AuthProvider>')
  return ctx
}

export function useAuthActions() {
  const ctx = useContext(AuthActionsContext)
  if (!ctx) throw new Error('useAuthActions must be inside <AuthProvider>')
  return ctx
}
