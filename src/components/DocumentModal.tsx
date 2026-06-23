import { useEffect } from 'react'
import { MarkdownEditor } from './MarkdownEditor'
import { useMindMapStore } from '../stores/mindmapStore'

export function DocumentModal() {
  const isOpen = useMindMapStore((state) => state.isDocumentModalOpen)
  const selectedDocument = useMindMapStore((state) => state.selectedDocument)
  const closeDocument = useMindMapStore((state) => state.closeDocument)
  const updateDocumentContent = useMindMapStore((state) => state.updateDocumentContent)
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
          <button
            aria-label="close document editor"
            className="icon-button"
            onClick={closeDocument}
            type="button"
          >
            {'\ub2eb\uae30'}
          </button>
        </div>

        <MarkdownEditor
          document={selectedDocument}
          onChange={(content) => updateDocumentContent(selectedDocument.id, content)}
          onTitleChange={(title) => updateDocumentTitle(selectedDocument.id, title)}
        />
      </div>
    </div>
  )
}
