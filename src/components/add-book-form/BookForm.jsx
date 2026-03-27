import AxisSelector from './AxisSelector'
import DuplicateWarning from './DuplicateWarning'

export default function BookForm({
  mode,
  inputClass,
  onSubmit,
  title,
  setTitle,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  year,
  setYear,
  selectedAxes,
  toggleAxis,
  description,
  setDescription,
  possibleDuplicates,
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      <h3 className="border-b border-white/10 pb-2.5 text-[0.82rem] font-bold uppercase tracking-[2px] text-white/50">
        {mode === 'edit' ? 'Modifier l\u2019ouvrage' : 'Nouvel ouvrage'}
      </h3>

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Titre
        </span>
        <input
          className={inputClass}
          placeholder="Ex : Feminist Theory"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
            Pr&eacute;nom
          </span>
          <input
            className={inputClass}
            placeholder="Ex : bell"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
            Nom
          </span>
          <input
            className={inputClass}
            placeholder="Ex : hooks"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
      </div>

      <DuplicateWarning possibleDuplicates={possibleDuplicates} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Ann&eacute;e
        </span>
        <input
          className={inputClass}
          type="number"
          placeholder="1984"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </label>

      <AxisSelector selectedAxes={selectedAxes} toggleAxis={toggleAxis} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1px] text-white/35">
          Description
        </span>
        <textarea
          className={`${inputClass} resize-none leading-relaxed`}
          rows={3}
          placeholder="Courte description de l'ouvrage..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <button
        type="submit"
        className="mt-1 w-full cursor-pointer rounded-[10px] bg-linear-to-br from-[rgba(140,220,255,0.7)] to-[rgba(80,160,255,0.9)] px-5 py-3.5 text-[0.85rem] font-semibold text-white shadow-[0_4px_20px_rgba(140,220,255,0.15)] transition-all hover:-translate-y-px hover:from-[rgba(140,220,255,0.9)] hover:to-[rgba(80,160,255,1)] hover:shadow-[0_4px_24px_rgba(140,220,255,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mode === 'edit' ? 'Enregistrer les modifications' : 'Ajouter l\u2019ouvrage'}
      </button>
    </form>
  )
}
