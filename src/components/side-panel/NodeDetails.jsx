export default function NodeDetails({
  selectedNode,
  AXES_COLORS,
  sameAuthorBooks,
  panelTab,
  setPanelTab,
  setSelectedNode,
  setSelectedLink,
  setPrefilledSourceId,
  setPrefilledTargetId,
  setPreviousPanelTab,
  getOutgoingRefs,
  getIncomingRefs,
}) {
  return (
    <div className="px-6 pb-8 pt-12">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(selectedNode.axes || []).map((axis) => (
            <span
              key={axis}
              className="inline-block rounded-full px-3 py-[3px] text-[0.68rem] font-bold uppercase tracking-[0.5px] text-black"
              style={{ backgroundColor: AXES_COLORS[axis] }}
            >
              {axis}
            </span>
          ))}
        </div>

        <button
          type="button"
          className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.75rem] font-semibold text-white/60 transition-all hover:border-[rgba(168,85,247,0.5)] hover:bg-[rgba(168,85,247,0.2)] hover:text-white"
          onClick={() => setPanelTab('edit')}
        >
          &#9998; Modifier
        </button>
      </div>

      <h2 className="mb-1 text-[1.3rem] font-bold leading-snug text-white">{selectedNode.title}</h2>
      <p className="mb-0.5 text-[0.95rem] italic text-white/55">{selectedNode.author}</p>
      <p className="mb-3.5 text-[0.85rem] text-white/35">{selectedNode.year}</p>
      {selectedNode.description && (
        <p className="mb-4 text-[0.88rem] leading-relaxed text-white/60">{selectedNode.description}</p>
      )}

      {sameAuthorBooks.length > 0 && (
        <>
          <h3 className="mb-3 mt-5 text-[0.78rem] font-semibold uppercase tracking-[1.5px] text-white/35">
            Autres ouvrages de {selectedNode.author} ({sameAuthorBooks.length})
          </h3>
          <ul className="mb-5 flex list-none flex-col gap-2 border-b border-white/10 pb-5">
            {sameAuthorBooks.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 text-left transition-all hover:border-white/20 hover:bg-white/8"
                  onClick={() => {
                    setSelectedLink(null)
                    setSelectedNode(n)
                    setPanelTab('details')
                  }}
                >
                  <strong className="mb-0.5 block text-[0.88rem] text-white">{n.title}</strong>
                  <span className="text-[0.75rem] text-white/30">{n.year}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mb-5 flex flex-wrap gap-2 border-b border-white/10 pb-5">
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.75rem] font-semibold text-[rgba(140,220,255,0.7)] transition-all hover:border-[rgba(140,220,255,0.5)] hover:bg-[rgba(140,220,255,0.15)] hover:text-white"
          onClick={() => {
            setPrefilledSourceId(selectedNode.id)
            setPrefilledTargetId(null)
            setPreviousPanelTab(panelTab)
            setPanelTab('link')
          }}
        >
          Ajouter un lien vers…
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-[6px] text-[0.75rem] font-semibold text-[rgba(255,171,64,0.7)] transition-all hover:border-[rgba(255,171,64,0.5)] hover:bg-[rgba(255,171,64,0.15)] hover:text-white"
          onClick={() => {
            setPrefilledSourceId(null)
            setPrefilledTargetId(selectedNode.id)
            setPreviousPanelTab(panelTab)
            setPanelTab('link')
          }}
        >
          Ajouter un lien depuis…
        </button>
      </div>

      {getOutgoingRefs(selectedNode).length > 0 && (
        <>
          <h3 className="mb-3 mt-5 text-[0.78rem] font-semibold uppercase tracking-[1.5px] text-white/35">
            <span className="inline-block text-[0.85rem] font-bold text-[rgba(140,220,255,0.8)]">&rarr;</span>
            {' '}Références citées ({getOutgoingRefs(selectedNode).length})
          </h3>
          <ul className="flex list-none flex-col gap-2">
            {getOutgoingRefs(selectedNode).map(({ link, other }, i) => (
              <li
                key={i}
                className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 transition-all hover:border-[rgba(140,220,255,0.25)] hover:bg-[rgba(140,220,255,0.08)]"
                onClick={() => {
                  setSelectedNode(null)
                  setSelectedLink(link)
                }}
              >
                <span className="mb-1 inline-block text-[0.68rem] font-bold uppercase tracking-[0.5px] text-[rgba(140,220,255,0.7)]">&rarr; cite</span>
                <strong className="mb-0.5 block text-[0.88rem] text-white">{other?.title}</strong>
                <span className="text-[0.75rem] text-white/30">{link.page}</span>
                <p className="mt-1.5 text-[0.8rem] italic leading-relaxed text-white/45">{link.citation_text}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {getIncomingRefs(selectedNode).length > 0 && (
        <>
          <h3 className="mb-3 mt-5 text-[0.78rem] font-semibold uppercase tracking-[1.5px] text-white/35">
            <span className="inline-block text-[0.85rem] font-bold text-[rgba(255,171,64,0.8)]">&larr;</span>
            {' '}Cité par ({getIncomingRefs(selectedNode).length})
          </h3>
          <ul className="flex list-none flex-col gap-2">
            {getIncomingRefs(selectedNode).map(({ link, other }, i) => (
              <li
                key={i}
                className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 transition-all hover:border-[rgba(255,171,64,0.25)] hover:bg-[rgba(255,171,64,0.08)]"
                onClick={() => {
                  setSelectedNode(null)
                  setSelectedLink(link)
                }}
              >
                <span className="mb-1 inline-block text-[0.68rem] font-bold uppercase tracking-[0.5px] text-[rgba(255,171,64,0.7)]">&larr; cité par</span>
                <strong className="mb-0.5 block text-[0.88rem] text-white">{other?.title}</strong>
                <span className="text-[0.75rem] text-white/30">{link.page}</span>
                <p className="mt-1.5 text-[0.8rem] italic leading-relaxed text-white/45">{link.citation_text}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

