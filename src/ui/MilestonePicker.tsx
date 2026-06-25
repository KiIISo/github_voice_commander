import { useEffect, useRef, useState } from 'react'
import { fetchMilestones, setIssueMilestone } from '../api/github'
import { log } from '../logger'

interface Milestone { number: number; title: string; open_issues: number; closed_issues: number }

export default function MilestonePicker({
  token, owner, repo, issueNumber,
  currentMilestone, onClose, onSaved,
}: {
  token: string; owner: string; repo: string; issueNumber: number
  currentMilestone: { number: number; title: string } | null
  onClose: () => void
  onSaved: (milestone: { number: number; title: string } | null) => void
}) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selected, setSelected] = useState<number | null>(currentMilestone?.number ?? null)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMilestones(token, owner, repo)
      .then((data) => setMilestones(data as Milestone[]))
      .catch((err: unknown) => log.error('Failed to fetch milestones', { error: String(err) }))
  }, [token, owner, repo])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function pick(milestoneNumber: number | null) {
    setSelected(milestoneNumber)
    setSaving(true)
    try {
      await setIssueMilestone(token, owner, repo, issueNumber, milestoneNumber)
      const ms = milestones.find((m) => m.number === milestoneNumber) ?? null
      onSaved(ms ? { number: ms.number, title: ms.title } : null)
      onClose()
    } catch (err) {
      log.error('Failed to set milestone', { error: String(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.overlay}>
      <div ref={ref} style={s.panel}>
        <div style={s.header}>
          <span style={s.title}>Set milestone</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={s.list}>
          <label style={s.row} onClick={() => pick(null)}>
            <input type="radio" readOnly checked={selected === null} style={{ accentColor: '#58a6ff' }} />
            <span style={s.name}>No milestone</span>
          </label>
          {milestones.length === 0 ? (
            <p style={s.empty}>No open milestones in this repo.</p>
          ) : milestones.map((ms) => (
            <label key={ms.number} style={s.row} onClick={() => pick(ms.number)}>
              <input type="radio" readOnly checked={selected === ms.number} style={{ accentColor: '#58a6ff' }} />
              <div>
                <div style={s.name}>{ms.title}</div>
                <div style={s.meta}>{ms.open_issues} open · {ms.closed_issues} closed</div>
              </div>
            </label>
          ))}
        </div>
        {saving && <div style={s.saving}>Saving…</div>}
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
  row: { display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.6rem 1rem', cursor: 'pointer', fontFamily: 'system-ui, sans-serif' },
  name: { fontSize: '0.85rem', color: '#e6edf3', fontWeight: 500 },
  meta: { fontSize: '0.75rem', color: '#8b949e', marginTop: '0.1rem' },
  empty: { color: '#8b949e', fontSize: '0.85rem', padding: '0.75rem 1rem', fontFamily: 'system-ui, sans-serif' },
  saving: { padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#8b949e', fontFamily: 'system-ui, sans-serif', borderTop: '1px solid #21262d' },
}
