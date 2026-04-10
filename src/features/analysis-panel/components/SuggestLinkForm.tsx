import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import type { Book, Link } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { matchAllWords } from '@/common/utils/searchUtils'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { SearchResultsDropdown } from '@/common/components/ui/SearchResultsDropdown'

type Props = {
  bookNodes: Book[]
  onAddLink: (link: Partial<Link> & Pick<Link, 'source' | 'target'>) => void
  authorsMap: Map<string, AuthorNode>
}

export function SuggestLinkForm({ bookNodes, onAddLink, authorsMap }: Props) {
  const [show, setShow] = useState(false)
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [sourceSearch, setSourceSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')

  const selectedSource = useMemo(() => bookNodes.find((n) => n.id === source) || null, [bookNodes, source])
  const selectedTarget = useMemo(() => bookNodes.find((n) => n.id === target) || null, [bookNodes, target])

  const sourceResults = useMemo(() => {
    if (!sourceSearch.trim()) return []
    return bookNodes
      .filter((n) => matchAllWords(sourceSearch, n.title + ' ' + bookAuthorDisplay(n, authorsMap)))
      .map((n) => ({ ...n, meta: bookAuthorDisplay(n, authorsMap) }))
  }, [bookNodes, sourceSearch, authorsMap])

  const targetResults = useMemo(() => {
    if (!targetSearch.trim()) return []
    return bookNodes
      .filter((n) => matchAllWords(targetSearch, n.title + ' ' + bookAuthorDisplay(n, authorsMap)))
      .map((n) => ({ ...n, meta: bookAuthorDisplay(n, authorsMap) }))
  }, [bookNodes, targetSearch, authorsMap])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
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
        className="w-full cursor-pointer rounded-lg border border-white/15 bg-white/5 py-2.5 text-[0.82rem] font-bold uppercase tracking-[1.5px] text-white/70 transition-all hover:bg-white/10 hover:text-white"
      >
        + Suggérer un nouveau lien
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-white/5 p-3">
      <h4 className="mb-3 text-[0.75rem] font-bold uppercase tracking-[1.5px] text-white/70">
        Nouveau lien suggéré
      </h4>

      <label className="mb-1 block text-[0.72rem] uppercase text-white/30">Source</label>
      <TextInput
        variant="table"
        className="mb-2 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[0.8rem] placeholder:text-white/35"
        value={sourceSearch || (selectedSource ? `${selectedSource.title} — ${bookAuthorDisplay(selectedSource, authorsMap)}` : '')}
        onChange={(e) => {
          if (source) setSource('')
          setSourceSearch(e.target.value)
        }}
        placeholder={source ? 'Changer la source…' : 'Rechercher la source…'}
      />
      {sourceSearch.trim() && (
        <SearchResultsDropdown
          results={sourceResults}
          onPick={(n) => {
            setSource(n.id)
            setSourceSearch('')
          }}
          emptyLabel="Aucun résultat"
          maxHeight="max-h-[160px]"
          className="mb-2.5"
        />
      )}

      <label className="mb-1 block text-[0.72rem] uppercase text-white/30">Cible</label>
      <TextInput
        variant="table"
        className="mb-2 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[0.8rem] placeholder:text-white/35"
        value={targetSearch || (selectedTarget ? `${selectedTarget.title} — ${bookAuthorDisplay(selectedTarget, authorsMap)}` : '')}
        onChange={(e) => {
          if (target) setTarget('')
          setTargetSearch(e.target.value)
        }}
        placeholder={target ? 'Changer la cible…' : 'Rechercher la cible…'}
      />
      {targetSearch.trim() && (
        <SearchResultsDropdown
          results={targetResults}
          onPick={(n) => {
            setTarget(n.id)
            setTargetSearch('')
          }}
          emptyLabel="Aucun résultat"
          maxHeight="max-h-[160px]"
          className="mb-3"
        />
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!source || !target || source === target}
          className="flex-1 cursor-pointer rounded border border-white/15 bg-white/5 py-1.5 text-[0.75rem] font-bold uppercase text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          Proposer
        </Button>
        <Button
          type="button"
          onClick={() => setShow(false)}
          className="cursor-pointer rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[0.75rem] text-white/40 transition-all hover:text-white/70"
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
