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
      {keys.map((k) => (
        <KeyCap key={k}>{k}</KeyCap>
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
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 96,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        padding: '12px 14px',
        background: 'rgba(6, 3, 15, 0.65)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(120, 180, 255, 0.1)',
        borderRadius: 10,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <HintRow keys={['↑', '↓', '←', '→']} label="Déplacer la caméra (dans l’espace)" />
      <HintRow keys={['+', '-', 'Z', 'S']} label="Zoom / dézoom" />
      <div
        style={{
          height: 1,
          background: 'rgba(120, 180, 255, 0.08)',
          margin: '4px 0',
        }}
      />
      <HintRow keys={['Espace']} label="Recentrer (vue d’ensemble)" />
    </div>
  )
}
