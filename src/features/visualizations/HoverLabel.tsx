interface Props {
  x: number
  y: number
  author: string
  title: string
}

const FONT_SIZE = 11
const LINE_HEIGHT = FONT_SIZE * 1.3
const PAD_X = 6
const PAD_Y = 4

export function HoverLabel({ x, y, author, title }: Props) {
  const displayAuthor = author.toUpperCase()
  return (
    <g pointerEvents="none">
      {/* Dark background — sized via an approximate char width */}
      <rect
        x={x - estimateWidth(displayAuthor, title) / 2 - PAD_X}
        y={y - LINE_HEIGHT * 2 - PAD_Y}
        width={estimateWidth(displayAuthor, title) + PAD_X * 2}
        height={LINE_HEIGHT * 2 + PAD_Y * 2}
        rx={4}
        fill="rgba(0,0,0,0.72)"
      />
      <text
        x={x}
        y={y - LINE_HEIGHT - PAD_Y}
        textAnchor="middle"
        fontSize={FONT_SIZE}
        fontWeight={700}
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fill="white"
      >
        {displayAuthor}
      </text>
      <text
        x={x}
        y={y - PAD_Y}
        textAnchor="middle"
        fontSize={FONT_SIZE * 0.9}
        fontWeight={400}
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fill="rgba(255,255,255,0.8)"
      >
        {title}
      </text>
    </g>
  )
}

function estimateWidth(author: string, title: string): number {
  const charW = FONT_SIZE * 0.58
  return Math.max(author.length, title.length) * charW
}
