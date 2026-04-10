import { useState } from 'react'
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-bg-overlay/98 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex flex-col items-start gap-2">
            <Logo />
            <h2 className="text-lg font-semibold text-white/90">
              {needsProfile
                ? 'Votre profil'
                : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
            </h2>
            <p className="text-sm text-white/40">
              {needsProfile
                ? 'Renseignez votre nom pour contribuer'
                : 'Connectez-vous pour contribuer au graphe'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeLoginModal}
            className="rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white/70"
          >
            <X size={16} />
          </button>
        </div>

        {needsProfile ? (
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-white/50">Prénom</span>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/20 focus:border-violet/50 focus:ring-1 focus:ring-violet/30"
                placeholder="Votre prénom"
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-white/50">Nom</span>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/20 focus:border-violet/50 focus:ring-1 focus:ring-violet/30"
                placeholder="Votre nom"
              />
            </label>

            {error && (
              <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50"
            >
              {submitting ? '...' : 'Enregistrer'}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-white/50">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/20 focus:border-violet/50 focus:ring-1 focus:ring-violet/30"
                  placeholder="vous@exemple.com"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-white/50">
                  {mode === 'signup' ? 'Choisir un mot de passe' : 'Mot de passe'}
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition placeholder:text-white/20 focus:border-violet/50 focus:ring-1 focus:ring-violet/30"
                  placeholder="6 caractères minimum"
                />
              </label>

              {error && (
                <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
              )}

              {success && (
                <p className="rounded-md bg-green/10 px-3 py-2 text-xs text-green">{success}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-violet/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-50"
              >
                {submitting
                  ? '...'
                  : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-white/40">
              {mode === 'login' ? (
                <>
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); setSuccess(null) }}
                    className="text-violet hover:underline"
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
                    className="text-violet hover:underline"
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
