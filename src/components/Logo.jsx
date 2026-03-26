import { AXES_COLORS } from '../categories'

export default function Logo() {
  const logoGradientStops = Object.values(AXES_COLORS)

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          {logoGradientStops.map((color, i) => (
            <stop key={color} offset={`${(i / Math.max(logoGradientStops.length - 1, 1)) * 100}%`} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <path d="m10.586 5.414-5.172 5.172" stroke="url(#logo-gradient)" />
      <path d="m18.586 13.414-5.172 5.172" stroke="url(#logo-gradient)" />
      <path d="M6 12h12" stroke="url(#logo-gradient)" />
      <circle cx="12" cy="20" r="2" stroke="url(#logo-gradient)" />
      <circle cx="12" cy="4" r="2" stroke="url(#logo-gradient)" />
      <circle cx="20" cy="12" r="2" stroke="url(#logo-gradient)" />
      <circle cx="4" cy="12" r="2" stroke="url(#logo-gradient)" />
    </svg>
  )
}
