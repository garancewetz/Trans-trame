import { useMemo, useState } from 'react'
import { bookAuthorDisplay } from '../../authorUtils'
import Button from '../../components/ui/Button'
import TextInput from '../../components/ui/TextInput'

export default function SuggestLinkForm({ bookNodes, onAddLink, authorsMap }) {
  const [show, setShow] = useState(false)
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [sourceSearch, setSourceSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')

  const selectedSource = useMemo(() => bookNodes.find((n) => n.id === source) || null, [bookNodes, source])
  const selectedTarget = useMemo(() => bookNodes.find((n) => n.id === target) || null, [bookNodes, target])

  const sourceResults = useMemo(() => {
    const q = sourceSearch.toLowerCase().trim()
    if (!q) return []
    return bookNodes.filter((n) => n.title.toLowerCase().includes(q) || bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q))
  }, [bookNodes, sourceSearch])

  const targetResults = useMemo(() => {
    const q = targetSearch.toLowerCase().trim()
    if (!q) return []
    return bookNodes.filter((n) => n.title.toLowerCase().includes(q) || bookAuthorDisplay(n, authorsMap).toLowerCase().includes(q))
  }, [bookNodes, targetSearch])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!source || !target || source === target) return
    onAddLink({
      source,
      target,
      citation_text: 'Soudure suggérée par la communauté',
      page: '',
      context: 'Suggestion communautaire',
    })
    setSource('')
    setTarget('')
    setSourceSearch('')
    setTargetSearch('')
    setShow(false)
  }

  if (!show) {
    return (
      <Button
        type="button"
        onClick={() => setShow(true)}
        className="w-full cursor-pointer rounded-lg border border-white/15 bg-white/5 py-2.5 text-[0.72rem] font-bold uppercase tracking-[1.5px] text-white/70 transition-all hover:bg-white/10 hover:text-white"
      >
        + Suggérer un nouveau lien
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-white/5 p-3">
      <h4 className="mb-3 text-[0.68rem] font-bold uppercase tracking-[1.5px] text-white/70">
        Nouveau lien suggéré
      </h4>

      <label className="mb-1 block text-[0.62rem] uppercase text-white/30">Source</label>
      <TextInput
        variant="table"
        className="mb-2 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[0.7rem] placeholder:text-white/25"
        value={sourceSearch || (selectedSource ? `${selectedSource.title} — ${bookAuthorDisplay(selectedSource, authorsMap)}` : '')}
        onChange={(e) => {
          if (source) setSource('')
          setSourceSearch(e.target.value)
        }}
        placeholder={source ? 'Changer la source…' : 'Rechercher la source…'}
      />
      {sourceSearch.trim() && (
        <div className="mb-2.5 max-h-[160px] overflow-y-auto rounded border border-white/10 bg-white/5 p-1">
          {sourceResults.length === 0 ? (
            <div className="px-2 py-2 text-center text-[0.7rem] text-white/35">Aucun résultat</div>
          ) : (
            <ul className="flex list-none flex-col">
              {sourceResults.map((n) => (
                <li key={n.id}>
                  <Button
                    type="button"
                    className="w-full cursor-pointer rounded bg-transparent px-2 py-2 text-left text-[0.7rem] text-white/75 transition-colors hover:bg-white/10"
                    onClick={() => {
                      setSource(n.id)
                      setSourceSearch('')
                    }}
                  >
                    {n.title} — <span className="text-white/35">{bookAuthorDisplay(n, authorsMap)}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <label className="mb-1 block text-[0.62rem] uppercase text-white/30">Cible</label>
      <TextInput
        variant="table"
        className="mb-2 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[0.7rem] placeholder:text-white/25"
        value={targetSearch || (selectedTarget ? `${selectedTarget.title} — ${bookAuthorDisplay(selectedTarget, authorsMap)}` : '')}
        onChange={(e) => {
          if (target) setTarget('')
          setTargetSearch(e.target.value)
        }}
        placeholder={target ? 'Changer la cible…' : 'Rechercher la cible…'}
      />
      {targetSearch.trim() && (
        <div className="mb-3 max-h-[160px] overflow-y-auto rounded border border-white/10 bg-white/5 p-1">
          {targetResults.length === 0 ? (
            <div className="px-2 py-2 text-center text-[0.7rem] text-white/35">Aucun résultat</div>
          ) : (
            <ul className="flex list-none flex-col">
              {targetResults.map((n) => (
                <li key={n.id}>
                  <Button
                    type="button"
                    className="w-full cursor-pointer rounded bg-transparent px-2 py-2 text-left text-[0.7rem] text-white/75 transition-colors hover:bg-white/10"
                    onClick={() => {
                      setTarget(n.id)
                      setTargetSearch('')
                    }}
                  >
                    {n.title} — <span className="text-white/35">{bookAuthorDisplay(n, authorsMap)}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!source || !target || source === target}
          className="flex-1 cursor-pointer rounded border border-white/15 bg-white/5 py-1.5 text-[0.68rem] font-bold uppercase text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          Proposer
        </Button>
        <Button
          type="button"
          onClick={() => setShow(false)}
          className="cursor-pointer rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[0.68rem] text-white/40 transition-all hover:text-white/70"
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
