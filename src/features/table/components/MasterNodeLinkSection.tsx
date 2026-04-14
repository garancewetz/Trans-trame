import { Link2, X } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import type { Book } from '@/types/domain'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { NodeSearch } from './NodeSearch'
import { INPUT } from '../tableConstants'

type Props = {
  masterNode: Book | null
  setMasterNode: (node: Book | null) => void
  masterContext: string
  setMasterContext: (value: string) => void
  linkDirection: string
  setLinkDirection: (value: string) => void
  existingNodes: Book[]
  authorsMap: Map<string, AuthorNode>
}

export function MasterNodeLinkSection({
  masterNode,
  setMasterNode,
  masterContext,
  setMasterContext,
  linkDirection,
  setLinkDirection,
  existingNodes,
  authorsMap,
}: Props) {
  return (
    <div className="mb-4 rounded-xl border border-white/8 bg-white/2 p-3">
      <label className="mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[1.2px] text-white/35">
        <Link2 size={10} /> Créer des liens avec…
        <span className="ml-1 font-normal normal-case tracking-normal text-white/22">(optionnel)</span>
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <NodeSearch
            nodes={existingNodes}
            authorsMap={authorsMap}
            value={masterNode}
            onSelect={setMasterNode}
            placeholder="Rechercher un ouvrage source…"
          />
        </div>
        {masterNode && (
          <Button
            type="button"
            onClick={() => { setMasterNode(null); setMasterContext(''); setLinkDirection('master-cites-imported') }}
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-white/30 transition-colors hover:text-white"
          >
            <X size={13} />
          </Button>
        )}
      </div>
      {masterNode && (
        <>
          <select
            className={INPUT + ' mt-2'}
            value={linkDirection}
            onChange={(e) => setLinkDirection(e.target.value)}
          >
            <option value="master-cites-imported">L'oeuvre source cite chaque ouvrage importé</option>
            <option value="imported-cites-master">Chaque ouvrage importé cite l'oeuvre source</option>
          </select>
          <TextInput
            variant="table"
            className={INPUT + ' mt-2'}
            placeholder="Contexte de citation appliqué à tous les liens…"
            value={masterContext}
            onChange={(e) => setMasterContext(e.target.value)}
          />
        </>
      )}
    </div>
  )
}
