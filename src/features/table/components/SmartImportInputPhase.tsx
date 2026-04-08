import { Link2, Loader2, X, Zap } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { TextareaImport } from '@/common/components/ui/TextareaImport'
import { NodeSearch } from './TableSubcomponents'
import { INPUT } from '../tableConstants'

export function SmartImportInputPhase({
  rawText,
  setRawText,
  masterNode,
  setMasterNode,
  masterContext,
  setMasterContext,
  linkDirection,
  setLinkDirection,
  existingNodes,
  authorsMap,
  analyzing,
  analyzeProgress,
}) {
  return (
    <>
      <p className="mb-3 text-[0.82rem] text-white/40">
        Colle une bibliographie, un texte OCR ou une liste d&apos;ouvrages.
        L&apos;app détectera auteurs, titres et années.
      </p>

      <TextareaImport
        placeholder={
          'BEAUVOIR Simone de, Le Deuxième Sexe, 1949\nbell hooks (2019), Apprendre à transgresser\nButler J., Gender Trouble, 1990\nPardo et Delor, Femmes et féminismes'
        }
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey) || !rawText.trim()) return
          e.preventDefault()
          e.currentTarget.form?.requestSubmit()
        }}
        autoFocus
      />

      <div className="mb-4 rounded-xl border border-white/8 bg-white/2 p-3">
        <label className="mb-2 flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-[1.2px] text-white/35">
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
              <option value="master-cites-imported">L'œuvre source cite chaque ouvrage importé</option>
              <option value="imported-cites-master">Chaque ouvrage importé cite l'œuvre source</option>
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

      {analyzing ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-2 text-[0.85rem] text-cyan/70">
            <Loader2 size={14} className="animate-spin" />
            <span>Analyse en cours… {Math.round(analyzeProgress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-cyan/60 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(analyzeProgress, 3)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!rawText.trim()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan/35 bg-cyan/10 px-4 py-2 text-[0.85rem] font-semibold text-cyan/85 transition-all hover:bg-cyan/18 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Zap size={13} /> Analyser
          </Button>
        </div>
      )}
    </>
  )
}
