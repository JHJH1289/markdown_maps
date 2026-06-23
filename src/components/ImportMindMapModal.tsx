import { useEffect, useState } from 'react'
import { useMindMapStore } from '../stores/mindmapStore'

type ImportMindMapModalProps = {
  onClose: () => void
}

export function ImportMindMapModal({ onClose }: ImportMindMapModalProps) {
  const [rawJson, setRawJson] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const importSimpleMindMap = useMindMapStore((state) => state.importSimpleMindMap)
  const saveSnapshot = useMindMapStore((state) => state.saveSnapshot)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleImport = async () => {
    setErrorMessage(null)
    setImportedCount(null)

    try {
      const count = importSimpleMindMap(rawJson)
      await saveSnapshot()
      setImportedCount(count)
      window.setTimeout(onClose, 520)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Import failed. Check the JSON.',
      )
    }
  }

  return (
    <div
      aria-labelledby="import-modal-title"
      aria-modal="true"
      className="modal-backdrop"
      role="dialog"
    >
      <div className="import-modal">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">JSON import</p>
            <h2 id="import-modal-title">Create mind map</h2>
          </div>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="save-button"
              disabled={rawJson.trim().length === 0}
              onClick={() => void handleImport()}
              type="button"
            >
              Import
            </button>
          </div>
        </div>

        <textarea
          aria-label="simpleMindMap JSON"
          className="import-textarea"
          onChange={(event) => setRawJson(event.target.value)}
          placeholder='{"simpleMindMap":true,"data":[...]}'
          spellCheck={false}
          value={rawJson}
        />

        {errorMessage && <div className="import-error">{errorMessage}</div>}
        {importedCount !== null && (
          <div className="import-success">{importedCount} nodes imported.</div>
        )}
      </div>
    </div>
  )
}
