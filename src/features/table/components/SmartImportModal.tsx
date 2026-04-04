import { Zap } from 'lucide-react'
import { Modal } from '@/common/components/ui/Modal'
import { SmartImportInputPhase } from './SmartImportInputPhase'
import { SmartImportPreviewPhase } from './SmartImportPreviewPhase'
import type { SmartImportModalProps } from '../smartImportModal.types'
import { useSmartImportModalLogic } from '../hooks/useSmartImportModalLogic'

export type { SmartImportModalProps } from '../smartImportModal.types'

export function SmartImportModal(props: SmartImportModalProps) {
  const {
    open,
    existingNodes,
    authorsMap,
  } = props

  const c = useSmartImportModalLogic(props)

  if (!open) return null

  return (
    <Modal
      open={open}
      title="Import Magique"
      titleIcon={<Zap size={14} className="text-cyan/70" />}
      onClose={c.handleClose}
      onBack={c.phase === 'preview' ? c.goBack : undefined}
      as="form"
      onSubmit={c.handleSubmit}
      containerClassName="transition-all duration-200"
      maxWidth={c.phase === 'preview' ? 'max-w-5xl' : 'max-w-4xl'}
    >
      {c.phase === 'input' && (
        <SmartImportInputPhase
          rawText={c.rawText}
          setRawText={c.setRawText}
          masterNode={c.masterNode}
          setMasterNode={c.setMasterNode}
          masterContext={c.masterContext}
          setMasterContext={c.setMasterContext}
          linkDirection={c.linkDirection}
          setLinkDirection={c.setLinkDirection}
          existingNodes={existingNodes}
          authorsMap={authorsMap}
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
          onAddCoAuthor={c.handleAddCoAuthor}
          onUpdateAxes={c.handleUpdateAxes}
          masterNode={c.masterNode}
          linkDirection={c.linkDirection}
          selectedCount={c.checked.size}
          injected={c.injected}
          inserting={c.inserting}
          handleClose={c.handleClose}
        />
      )}
    </Modal>
  )
}
