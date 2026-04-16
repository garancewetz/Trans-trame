import { Zap } from 'lucide-react'
import { Modal } from '@/common/components/ui/Modal'
import { SmartImportInputPhase } from './SmartImportInputPhase'
import { SmartImportPreviewPhase } from './SmartImportPreviewPhase'
import type { SmartImportModalProps } from '../smartImportModal.types'
import { useSmartImportModalLogic } from '../hooks/useSmartImportModalLogic'

export function SmartImportModal(props: SmartImportModalProps) {
  const {
    open,
    existingNodes,
    authorsMap,
  } = props

  const c = useSmartImportModalLogic(props)

  if (!open) return null

  const hasUnsavedWork =
    !c.injected &&
    ((c.phase === 'input' && (c.rawText.trim().length > 0 || c.imageFiles.length > 0)) ||
      (c.phase === 'preview' && c.parsed.length > 0))

  return (
    <Modal
      open={open}
      title="Import Magique"
      titleIcon={<Zap size={14} className="text-cyan/70" />}
      onClose={c.handleClose}
      onBack={c.phase === 'preview' ? c.goBack : undefined}
      step={{ current: c.phase === 'input' ? 1 : 2, total: 2 }}
      dirtyConfirmMessage={hasUnsavedWork ? 'Abandonner les modifications en cours ?' : null}
      as="form"
      onSubmit={c.handleSubmit}
      containerClassName="transition-all duration-200"
      maxWidth="max-w-7xl"
    >
      {c.phase === 'input' && (
        <SmartImportInputPhase
          rawText={c.rawText}
          setRawText={c.setRawText}
          inputMode={c.inputMode}
          setInputMode={c.setInputMode}
          imageFiles={c.imageFiles}
          imagePreviews={c.imagePreviews}
          addImages={c.addImages}
          removeImage={c.removeImage}
          masterNode={c.masterNode}
          setMasterNode={c.setMasterNode}
          masterContext={c.masterContext}
          setMasterContext={c.setMasterContext}
          linkDirection={c.linkDirection}
          setLinkDirection={c.setLinkDirection}
          existingNodes={existingNodes}
          authorsMap={authorsMap}
          analyzing={c.analyzing}
          analyzeProgress={c.analyzeProgress}
        />
      )}

      {c.phase === 'preview' && (
        <SmartImportPreviewPhase
          parsed={c.parsed}
          checked={c.checked}
          mergedIds={c.mergedIds}
          editingCell={c.editingCell}
          editingValue={c.editingValue}
          setEditingValue={c.setEditingValue}
          editingAuthor={c.editingAuthor}
          setEditingAuthor={c.setEditingAuthor}
          toggleItem={c.toggleItem}
          commitCellEdit={c.commitCellEdit}
          setEditingCell={c.setEditingCell}
          commitAuthorEdit={c.commitAuthorEdit}
          handleMerge={c.handleMerge}
          handleUnmerge={c.handleUnmerge}
          onDismissDuplicate={c.dismissDuplicate}
          onAddCoAuthor={c.handleAddCoAuthor}
          onUpdateAxes={c.handleUpdateAxes}
          onRemoveTheme={c.handleRemoveTheme}
          onSwapFields={c.handleSwapFields}
          onUpdateField={c.handleUpdateField}
          authorMergeSuggestions={c.authorMergeSuggestions}
          onAuthorMerge={c.handleAuthorMerge}
          onDismissAuthorMerge={c.dismissAuthorMerge}
          masterNode={c.masterNode}
          linkDirection={c.linkDirection}
          selectedCount={c.checked.size}
          injected={c.injected}
          inserting={c.inserting}
          handleClose={c.handleClose}
          knownEditions={c.knownEditions}
        />
      )}
    </Modal>
  )
}
