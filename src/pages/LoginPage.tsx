import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { X } from 'lucide-react'
import { useAuthState, useAuthActions } from '@/core/AuthContext'
import { Logo } from '@/common/components/Logo'

export function LoginModal() {
  const { loginModalOpen, user, profile } = useAuthState()
  const { signIn, signUp, closeLoginModal, updateProfile } = useAuthActions()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const titleId = useId()
  const errorId = useId()
  const emailId = useId()
  const passwordId = useId()
  const firstNameId = useId()
  const lastNameId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<Element | null>(null)

  useEffect(() => {
    if (!loginModalOpen) return
    previouslyFocused.current = document.activeElement
    const root = dialogRef.current
    const first = root?.querySelector<HTMLElement>('input, button')
    first?.focus()
    return () => {
      const prev = previouslyFocused.current
      if (prev instanceof HTMLElement) prev.focus()
    }
  }, [loginModalOpen])

  if (!loginModalOpen) return null

  const needsProfile = user && (!profile || (!profile.firstName && !profile.lastName))

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    const { error: err } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)

    setSubmitting(false)

    if (err) {
      setError(err)
    } else if (mode === 'signup') {
      setSuccess('Un email de confirmation a été envoyé. Vérifiez votre boîte de réception.')
    }
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() && !lastName.trim()) return
    setSubmitting(true)
    const { error: err } = await updateProfile(firstName.trim(), lastName.trim())
    setSubmitting(false)
    if (err) { setError(err); return }
    closeLoginModal()
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') closeLoginModal()
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-bg-overlay/98 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
      >
        <div className="mb-6 flex items-start justify-between">
          <div className="flex flex-col items-start gap-2">
            <Logo />
            <h2 id={titleId} className="text-lg font-semibold text-white/90">
              {needsProfile
                ? 'Votre profil'
                : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </h2>
            <p className="text-sm text-white/70">
              {needsProfile
                ? 'Renseignez votre nom pour contribuer'
                : 'Connectez-vous pour contribuer au graphe'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeLoginModal}
            aria-label="Fermer"
            className="rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {needsProfile ? (
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4" noValidate>
            <label htmlFor={firstNameId} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-white/70">Prénom</span>
              <input
                id={firstNameId}
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-errormessage={error ? errorId : undefined}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/40 focus:border-violet/60 focus:ring-2 focus:ring-violet/60"
                placeholder="Votre prénom"
                autoFocus
              />
            </label>

            <label htmlFor={lastNameId} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-white/70">Nom</span>
              <input
                id={lastNameId}
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-errormessage={error ? errorId : undefined}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/40 focus:border-violet/60 focus:ring-2 focus:ring-violet/60"
                placeholder="Votre nom"
              />
            </label>

            {error && (
              <p id={errorId} role="alert" className="rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
            >
              {submitting ? '...' : 'Enregistrer'}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4" noValidate>
              <label htmlFor={emailId} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-white/70">Email</span>
                <input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-errormessage={error ? errorId : undefined}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/40 focus:border-violet/60 focus:ring-2 focus:ring-violet/60"
                  placeholder="vous@exemple.com"
                />
              </label>

              <label htmlFor={passwordId} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-white/70">
                  {mode === 'signup' ? 'Choisir un mot de passe' : 'Mot de passe'}
                </span>
                <input
                  id={passwordId}
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-errormessage={error ? errorId : undefined}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/40 focus:border-violet/60 focus:ring-2 focus:ring-violet/60"
                  placeholder="8 caractères minimum"
                />
              </label>

              {error && (
                <p id={errorId} role="alert" className="rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}

              {success && (
                <p role="status" className="rounded-md bg-green/15 px-3 py-2 text-xs text-green">{success}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-violet/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
              >
                {submitting
                  ? '...'
                  : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-white/70">
              {mode === 'login' ? (
                <>
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); setSuccess(null) }}
                    className="text-violet hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
                  >
                    S'inscrire
                  </button>
                </>
              ) : (
                <>
                  Déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
                    className="text-violet hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
