import { useEffect, useRef, useState } from 'react'
import { fetchRepoLabels, setIssueLabels } from '../api/github'
import { log } from '../logger'

interface RepoLabel { name: string; color: string; description: string | null }

export default function LabelPicker({
  token, owner, repo, issueNumber,
  currentLabels, onClose, onSaved,
}: {
  token: string; owner: string; repo: string; issueNumber: number
  currentLabels: Array<{ name: string; color: string }>
  onClose: () => void
  onSaved: (labels: Array<{ name: string; color: string }>) => void
}) {
  const [allLabels, setAllLabels] = useState<RepoLabel[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(currentLabels.map((l) => l.name)))
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchRepoLabels(token, owner, repo)
      .then((data) => setAllLabels(data as RepoLabel[]))
      .catch((err: unknown) => log.error('Failed to fetch labels', { error: String(err) }))
  }, [token, owner, repo])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function save() {
    setSaving(true)
    try {
      const names = [...selected]
      await setIssueLabels(token, owner, repo, issueNumber, names)
      const saved = allLabels.filter((l) => selected.has(l.name)).map((l) => ({ name: l.name, color: l.color }))
      onSaved(saved)
      onClose()
    } catch (err) {
      log.error('Failed to save labels', { error: String(err) })
    } finally {
      setSaving(false)
    }
  }

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  return (
    <div style={s.overlay}>
      <div ref={ref} style={s.panel}>
        <div style={s.header}>
          <span style={s.title}>Apply labels</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={s.list}>
          {allLabels.length === 0 ? (
            <p style={s.empty}>No labels in this repo yet.</p>
          ) : allLabels.map((label) => (
            <label key={label.name} style={s.row}>
              <input
                type="checkbox"
                checked={selected.has(label.name)}
                onChange={() => toggle(label.name)}
                style={{ accentColor: `#${label.color}` }}
              />
              <span style={{ ...s.dot, background: `#${label.color}` }} />
              <span style={s.labelName}>{label.name}</span>
              {label.description && <span style={s.desc}>{label.description}</span>}
            </label>
          ))}
        </div>
        <div style={s.footer}>
          <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  panel: { background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '360px', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #21262d' },
  title: { fontWeight: 600, fontSize: '0.9rem', color: '#e6edf3', fontFamily: 'system-ui, sans-serif' },
  closeBtn: { background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1rem' },
  list: { maxHeight: '300px', overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' },
  dot: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0 },
  labelName: { fontSize: '0.85rem', color: '#e6edf3', fontWeight: 500 },
  desc: { fontSize: '0.75rem', color: '#8b949e', marginLeft: 'auto' },
  empty: { color: '#8b949e', fontSize: '0.85rem', padding: '1rem', fontFamily: 'system-ui, sans-serif' },
  footer: { padding: '0.75rem 1rem', borderTop: '1px solid #21262d' },
  saveBtn: { background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', width: '100%' },
}
