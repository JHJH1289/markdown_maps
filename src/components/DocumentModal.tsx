import { useEffect } from 'react'
import { MarkdownEditor } from './MarkdownEditor'
import { useMindMapStore } from '../stores/mindmapStore'
import type { ThemeMode } from '../types/mindmap'

type DocumentModalProps = {
  theme: ThemeMode
}

export function DocumentModal({ theme }: DocumentModalProps) {
  const isOpen = useMindMapStore((state) => state.isDocumentModalOpen)
  const selectedDocument = useMindMapStore((state) => state.selectedDocument)
  const nodes = useMindMapStore((state) => state.nodes)
  const closeDocument = useMindMapStore((state) => state.closeDocument)
  const saveSnapshot = useMindMapStore((state) => state.saveSnapshot)
  const updateDocumentContent = useMindMapStore((state) => state.updateDocumentContent)
  const updateDocumentStatus = useMindMapStore((state) => state.updateDocumentStatus)
  const updateDocumentTitle = useMindMapStore((state) => state.updateDocumentTitle)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDocument()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeDocument, isOpen])

  if (!isOpen || !selectedDocument) {
    return null
  }

  const selectedNode = nodes.find(
    (node) => node.data.documentId === selectedDocument.id,
  )
  const selectedStatus = selectedNode?.data.status ?? ''

  return (
    <div
      aria-labelledby="document-modal-title"
      aria-modal="true"
      className="modal-backdrop"
      role="dialog"
    >
      <div className="document-modal">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">{'\ub9c8\ud06c\ub2e4\uc6b4 \ubb38\uc11c'}</p>
            <h2 id="document-modal-title">{selectedDocument.title}</h2>
          </div>
          <div className="modal-actions">
            <label className="status-select">
              <span>{'\uc0c1\ud0dc'}</span>
              <input
                aria-label="Node status"
                onChange={(event) =>
                  updateDocumentStatus(selectedDocument.id, event.target.value)
                }
                placeholder="Label"
                value={selectedStatus}
              />
            </label>
            <button className="save-button" onClick={saveSnapshot} type="button">
              Save
            </button>
            <button
              aria-label="Close document editor"
              className="icon-button"
              onClick={closeDocument}
              type="button"
            >
              {'\ub2eb\uae30'}
            </button>
          </div>
        </div>

        <MarkdownEditor
          document={selectedDocument}
          onChange={(content) => updateDocumentContent(selectedDocument.id, content)}
          onTitleChange={(title) => updateDocumentTitle(selectedDocument.id, title)}
          theme={theme}
        />
      </div>
    </div>
  )
}
