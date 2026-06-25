import { useEffect, useState } from 'react'
import { fetchSubIssues, fetchIssueByNumber, addSubIssue, removeSubIssue, type SubIssueItem } from '../api/github'
import { log } from '../logger'

function OpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#1f883d', flexShrink: 0 }}>
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  )
}

function ClosedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#8250df', flexShrink: 0 }}>
      <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
    </svg>
  )
}

export default function SubIssues({
  token, owner, repo, issueNumber,
}: {
  token: string; owner: string; repo: string; issueNumber: number
}) {
  const [subIssues, setSubIssues] = useState<SubIssueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notSupported, setNotSupported] = useState(false)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubIssues(token, owner, repo, issueNumber)
      .then((data) => setSubIssues(data))
      .catch((err: unknown) => {
        const msg = String(err)
        if (msg.includes('404') || msg.includes('422') || msg.includes('501')) {
          setNotSupported(true)
        } else {
          log.error('Failed to load sub-issues', { error: msg })
        }
      })
      .finally(() => setLoading(false))
  }, [token, owner, repo, issueNumber])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(input.replace('#', '').trim(), 10)
    if (isNaN(num)) return
    setAdding(true)
    setAddError(null)
    try {
      const issue = await fetchIssueByNumber(token, owner, repo, num)
      await addSubIssue(token, owner, repo, issueNumber, issue.id)
      setSubIssues((prev) => [...prev, { id: issue.id, number: issue.number, title: issue.title, state: issue.state, html_url: issue.html_url }])
      setInput('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('Failed to add sub-issue', { error: msg })
      setAddError(msg.includes('404') ? `Issue #${num} not found` : 'Failed to add sub-issue')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(subIssue: SubIssueItem) {
    try {
      await removeSubIssue(token, owner, repo, issueNumber, subIssue.id)
      setSubIssues((prev) => prev.filter((s) => s.id !== subIssue.id))
    } catch (err) {
      log.error('Failed to remove sub-issue', { error: String(err) })
    }
  }

  if (notSupported) return null

  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <span style={s.sectionTitle}>Sub-issues</span>
      </div>

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : (
        <>
          {subIssues.length > 0 && (
            <div style={s.list}>
              {subIssues.map((si) => (
                <div key={si.id} style={s.row}>
                  {si.state === 'open' ? <OpenIcon /> : <ClosedIcon />}
                  <a href={si.html_url} target="_blank" rel="noreferrer" style={s.link}>
                    #{si.number} {si.title}
                  </a>
                  <button style={s.removeBtn} onClick={() => handleRemove(si)} title="Remove sub-issue">✕</button>
                </div>
              ))}
            </div>
          )}

          <form style={s.addForm} onSubmit={handleAdd}>
            <input
              style={s.input}
              type="text"
              placeholder="Issue number, e.g. #3"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              style={{ ...s.addBtn, opacity: adding || !input.trim() ? 0.5 : 1 }}
              type="submit"
              disabled={adding || !input.trim()}
            >
              {adding ? '…' : 'Add'}
            </button>
          </form>
          {addError && <p style={s.error}>{addError}</p>}
        </>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  section: { paddingTop: '0.1rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  sectionTitle: { fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'system-ui, sans-serif' },
  muted: { color: '#8b949e', fontSize: '0.8rem', fontFamily: 'system-ui, sans-serif' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' },
  row: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  link: { flex: 1, fontSize: '0.82rem', color: '#e6edf3', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  removeBtn: { background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '0.75rem', padding: '0 0.2rem', flexShrink: 0 },
  addForm: { display: 'flex', gap: '0.4rem' },
  input: {
    flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px',
    color: '#e6edf3', fontSize: '0.82rem', padding: '0.35rem 0.5rem', outline: 'none', fontFamily: 'system-ui, sans-serif',
  },
  addBtn: {
    background: '#21262d', color: '#e6edf3', border: '1px solid #30363d',
    borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600, flexShrink: 0,
  },
  error: { color: '#f85149', fontSize: '0.78rem', margin: '0.3rem 0 0', fontFamily: 'system-ui, sans-serif' },
}
