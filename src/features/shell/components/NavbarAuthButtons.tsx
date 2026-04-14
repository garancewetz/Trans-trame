import { LogOut, LogIn } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { Tooltip } from '@/common/components/ui/Tooltip'

type NavbarAuthButtonsProps = {
  user: { email?: string } | null
  profile: { firstName: string; lastName: string } | null
  onSignOut: () => void
  onRequireAuth: () => void
}

export function NavbarAuthButtons({ user, profile, onSignOut, onRequireAuth }: NavbarAuthButtonsProps) {
  if (user) {
    return (
      <Tooltip content={profile ? `${profile.firstName} ${profile.lastName}`.trim() || user.email || 'Déconnexion' : user.email ?? 'Déconnexion'}>
        <Button
          variant="outline"
          frosted
          onClick={onSignOut}
          type="button"
          aria-label="Déconnexion"
          className="h-[34px] w-[34px] justify-center px-0!"
        >
          <LogOut size={14} />
        </Button>
      </Tooltip>
    )
  }

  return (
    <Tooltip content="Se connecter">
      <Button
        variant="outline"
        frosted
        onClick={onRequireAuth}
        type="button"
        aria-label="Se connecter"
        className="h-[34px] w-[34px] justify-center px-0!"
      >
        <LogIn size={14} />
      </Button>
    </Tooltip>
  )
}
