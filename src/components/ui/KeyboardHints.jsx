import { useId, useState } from 'react'
import { Move, ChevronDown } from 'lucide-react'

const KeyCap = ({ children }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 22,
      height: 22,
      padding: '0 5px',
      background: 'rgba(180, 230, 255, 0.08)',
      border: '1px solid rgba(180, 230, 255, 0.25)',
      borderRadius: 5,
      borderBottomWidth: 2,
      fontFamily: 'monospace',
      fontSize: 11,
      fontWeight: 600,
      color: 'rgba(180, 230, 255, 0.9)',
      lineHeight: 1,
      letterSpacing: 0,
    }}
  >
    {children}
  </span>
)

const HintRow = ({ keys, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ display: 'flex', gap: 3 }}>
      {keys.map((k, i) => (
        <KeyCap key={`${label}-${i}-${k}`}>{k}</KeyCap>
      ))}
    </span>
    <span
      style={{
        color: 'rgba(200, 220, 255, 0.45)',
        fontSize: 11,
        letterSpacing: '0.03em',
      }}
    >
      {label}
    </span>
  </div>
)

export default function KeyboardHints() {
  const [collapsed, setCollapsed] = useState(false)
  const panelId = useId()

  return (
    <div
      className={`pointer-events-auto absolute bottom-20 right-6 z-20 flex select-none flex-col rounded-[10px] border border-white/10 bg-[rgba(6,3,15,0.45)] px-4 backdrop-blur-2xl backdrop-saturate-150 ${collapsed ? 'py-2' : 'py-3'}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-controls={panelId}
        aria-label={collapsed ? 'Développer les raccourcis de déplacement' : 'Réduire les raccourcis de déplacement'}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md text-left text-[0.62rem] font-bold uppercase tracking-[2px] text-white/30 outline-none transition-colors hover:text-white/45 focus-visible:ring-1 focus-visible:ring-white/20 ${collapsed ? '' : 'min-h-9'}`}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Move size={12} className="shrink-0" />
          Déplacement
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-white/25 transition-transform duration-200 ease-out ${collapsed ? '' : 'rotate-180'}`}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-hidden={collapsed}
        aria-label="Liste des raccourcis clavier"
        className={`grid min-h-0 transition-[grid-template-rows] duration-200 ease-out ${collapsed ? 'grid-rows-[0fr]' : 'mt-2 grid-rows-[1fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-[7px]">
            <HintRow keys={['↑', '↓', '←', '→']} label="Déplacer la caméra" />
            <HintRow keys={['+', '-', 'Z', 'S']} label="Zoom / dézoom" />
            <div
              role="separator"
              aria-hidden
              style={{
                height: 1,
                background: 'rgba(120, 180, 255, 0.08)',
                margin: '4px 0',
              }}
            />
            <HintRow keys={['Espace']} label="Recentrer" />
          </div>
        </div>
      </div>
    </div>
  )
}
