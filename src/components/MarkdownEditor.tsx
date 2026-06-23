import MDEditor from '@uiw/react-md-editor'
import type { MarkdownDocument, ThemeMode } from '../types/mindmap'

type MarkdownEditorProps = {
  document: MarkdownDocument
  onChange: (content: string) => void
  onTitleChange: (title: string) => void
  theme: ThemeMode
}

export function MarkdownEditor({
  document,
  onChange,
  onTitleChange,
  theme,
}: MarkdownEditorProps) {
  return (
    <div className="editor-stack" data-color-mode={theme}>
      <input
        aria-label="Document title"
        className="title-input"
        onChange={(event) => onTitleChange(event.target.value)}
        value={document.title}
      />
      <MDEditor
        height={560}
        onChange={(value) => onChange(value ?? '')}
        preview="edit"
        value={document.content}
      />
    </div>
  )
}
