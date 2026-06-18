import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMindMapStore } from '../stores/mindmapStore'

export function TitleSearch() {
  const [query, setQuery] = useState('')
  const documents = useMindMapStore((state) => state.documents)
  const focusDocumentNode = useMindMapStore((state) => state.focusDocumentNode)

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return []
    }

    return documents
      .filter((document) => document.title.toLowerCase().includes(normalizedQuery))
      .slice(0, 6)
  }, [documents, query])

  const focusNode = (documentId: string) => {
    focusDocumentNode(documentId)
    setQuery('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (results[0]) {
      focusNode(results[0].id)
    }
  }

  return (
    <form className="title-search" onSubmit={handleSubmit} role="search">
      <input
        aria-label="문서 제목 검색"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="제목 검색"
        type="search"
        value={query}
      />

      {results.length > 0 && (
        <div className="search-results">
          {results.map((document) => (
            <button
              key={document.id}
              onClick={() => focusNode(document.id)}
              type="button"
            >
              {document.title}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
