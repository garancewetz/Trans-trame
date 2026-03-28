export default function TableFooter({ tab, addedQueue }) {
  return (
    <div className="flex shrink-0 items-center gap-4 border-t border-white/[0.05] px-5 py-1.5 font-mono text-[0.6rem] text-white/16">
      <span>Cliquer pour éditer · Entrée = valider · Échap = annuler</span>
      {tab === 'books' && addedQueue.length > 0 && (
        <span className="text-[rgba(0,255,135,0.38)]">
          ✓ {addedQueue.slice(0, 3).join(' · ')}
        </span>
      )}
    </div>
  )
}
