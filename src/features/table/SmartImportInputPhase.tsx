import { Link2, X, Zap } from 'lucide-react'
import { NodeSearch } from './TableSubcomponents'
import { INPUT } from './tableConstants'

export default function SmartImportInputPhase({
  rawText,
  setRawText,
  masterNode,
  setMasterNode,
  masterContext,
  setMasterContext,
  existingNodes,
  authorsMap,
}) {
  return (
    <>
      <p className="mb-3 text-[0.73rem] text-white/40">
        Colle une bibliographie, un texte OCR ou une liste d&apos;ouvrages.
        L&apos;app détectera auteurs, titres et années.
      </p>

      <textarea
        className="mb-4 h-52 w-full resize-none rounded-xl border border-white/10 bg-white/4 p-3 font-mono text-[0.75rem] text-white outline-none placeholder:text-white/18 transition-all focus:border-[rgba(140,220,255,0.28)] focus:bg-white/6"
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
        <label className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[1.2px] text-white/35">
          <Link2 size={10} /> Lier ces ouvrages à…
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
            <button
              type="button"
              onClick={() => { setMasterNode(null); setMasterContext('') }}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-white/30 transition-colors hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {masterNode && (
          <input
            className={INPUT + ' mt-2'}
            placeholder="Contexte de citation appliqué à tous les liens…"
            value={masterContext}
            onChange={(e) => setMasterContext(e.target.value)}
          />
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!rawText.trim()}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(140,220,255,0.3)] bg-[rgba(140,220,255,0.07)] px-4 py-2 text-[0.75rem] font-semibold text-[rgba(140,220,255,0.8)] transition-all hover:bg-[rgba(140,220,255,0.14)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Zap size={13} /> Analyser
          <kbd className="ml-1 rounded border border-white/10 bg-white/5 px-1 py-px text-[0.55rem] text-white/30">⌘↵</kbd>
        </button>
      </div>
    </>
  )
}
