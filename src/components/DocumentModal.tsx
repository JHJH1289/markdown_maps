import { useEffect } from 'react'
import { MarkdownEditor } from './MarkdownEditor'
import { useMindMapStore } from '../stores/mindmapStore'
import type { MindMapNodeStatus, ThemeMode } from '../types/mindmap'

type DocumentModalProps = {
  theme: ThemeMode
}

const statusOptions: Array<{ label: string; value: MindMapNodeStatus }> = [
  { label: '숨김', value: 'hidden' },
  { label: '초안', value: 'draft' },
  { label: '완료', value: 'ready' },
]

export function DocumentModal({ theme }: DocumentModalProps) {
  const isOpen = useMindMapStore((state) => state.isDocumentModalOpen)
  const selectedDocument = useMindMapStore((state) => state.selectedDocument)
  const nodes = useMindMapStore((state) => state.nodes)
  const closeDocument = useMindMapStore((state) => state.closeDocument)
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
  const selectedStatus = selectedNode?.data.status ?? 'draft'

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
<<<<<<< HEAD
          <button
            aria-label="close document editor"
            className="icon-button"
            onClick={closeDocument}
            type="button"
          >
            {'\ub2eb\uae30'}
          </button>
=======
          <div className="modal-actions">
            <label className="status-select">
              <span>상태</span>
              <select
                aria-label="노드 상태"
                onChange={(event) =>
                  updateDocumentStatus(
                    selectedDocument.id,
                    event.target.value as MindMapNodeStatus,
                  )
                }
                value={selectedStatus}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              aria-label="문서 편집기 닫기"
              className="icon-button"
              onClick={closeDocument}
              type="button"
            >
              닫기
            </button>
          </div>
>>>>>>> 9ef15378c4422266d95da0ea4cc428520b4609e2
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
