import { useState } from 'react'
import { createIssue } from '../api/github'
import { log } from '../logger'
import type { RepoRef } from './IssueList'

export default function NewIssueForm({
  repo,
  token,
  onCreated,
  onCancel,
}: {
  repo: RepoRef
  token: string
  onCreated: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [owner, repoName] = repo.full_name.split('/')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await createIssue(token, owner, repoName, title.trim(), body.trim())
      onCreated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create issue'
      log.error('Create issue failed', { error: msg })
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onCancel}>← Cancel</button>
        <span style={s.headerTitle}>New Issue</span>
        <span style={s.repo}>{repo.name}</span>
      </header>

      <form style={s.form} onSubmit={handleSubmit}>
        <label style={s.label}>Title <span style={s.required}>*</span></label>
        <input
          style={s.input}
          type="text"
          placeholder="Short, descriptive title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <label style={s.label}>Description <span style={s.optional}>(optional)</span></label>
        <textarea
          style={s.textarea}
          placeholder="Describe the issue in detail. Markdown is supported."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
        />

        {error && <p style={s.error}>{error}</p>}

        <button
          style={{ ...s.submitBtn, opacity: submitting || !title.trim() ? 0.5 : 1 }}
          type="submit"
          disabled={submitting || !title.trim()}
        >
          {submitting ? 'Creating…' : 'Create Issue'}
        </button>
      </form>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'system-ui, sans-serif' },
  header: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
    padding: '1rem', borderBottom: '1px solid #21262d', background: '#161b22',
  },
  backBtn: {
    background: 'transparent', color: '#58a6ff', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0,
  },
  headerTitle: { fontWeight: 700, fontSize: '1rem', marginRight: 'auto' },
  repo: { color: '#8b949e', fontSize: '0.8rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem 1rem' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: '#e6edf3' },
  required: { color: '#f85149' },
  optional: { color: '#8b949e', fontWeight: 400 },
  input: {
    background: '#161b22', border: '1px solid #30363d', borderRadius: '6px',
    color: '#e6edf3', fontSize: '1rem', padding: '0.6rem 0.75rem', outline: 'none',
    fontFamily: 'system-ui, sans-serif',
  },
  textarea: {
    background: '#161b22', border: '1px solid #30363d', borderRadius: '6px',
    color: '#e6edf3', fontSize: '0.9rem', padding: '0.6rem 0.75rem', outline: 'none',
    resize: 'vertical', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5,
  },
  submitBtn: {
    background: '#238636', color: '#fff', border: 'none', borderRadius: '6px',
    padding: '0.75rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
    marginTop: '0.5rem',
  },
  error: { color: '#f85149', fontSize: '0.85rem', margin: 0 },
}
