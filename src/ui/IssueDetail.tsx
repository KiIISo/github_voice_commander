import { useEffect, useState } from 'react'
import { fetchComments, createComment, updateIssueState } from '../api/github'
import { log } from '../logger'
import LabelPicker from './LabelPicker'
import MilestonePicker from './MilestonePicker'
import SubIssues from './SubIssues'
import type { RepoRef, Issue } from './IssueList'

interface Comment {
  id: number
  body: string | null
  created_at: string
  user: { login: string; avatar_url: string } | null
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.717.645 7.264.095 8.007.031 8.234.01 8.117 0 8 0Zm-.5 4.5a3.5 3.5 0 1 0 1 0V4.5h-1Z" />
    </svg>
  )
}

function StateBadge({ state }: { state: 'open' | 'closed' }) {
  const open = state === 'open'
  return (
    <span style={{ ...badge.base, background: open ? '#1f883d' : '#8250df' }}>
      {open ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 5 }}>
          <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 5 }}>
          <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
        </svg>
      )}
      {open ? 'Open' : 'Closed'}
    </span>
  )
}

const badge: Record<string, React.CSSProperties> = {
  base: {
    display: 'inline-flex', alignItems: 'center', color: '#fff',
    borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.82rem', fontWeight: 600,
    fontFamily: 'system-ui, sans-serif',
  },
}

export default function IssueDetail({
  issue: initialIssue, repo, token, onBack,
}: {
  issue: Issue; repo: RepoRef; token: string; onBack: () => void
}) {
  const [issue, setIssue] = useState(initialIssue)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [showMilestonePicker, setShowMilestonePicker] = useState(false)

  const [owner, repoName] = repo.full_name.split('/')

  useEffect(() => {
    fetchComments(token, owner, repoName, issue.number)
      .then((data) => setComments(data as Comment[]))
      .catch((err: unknown) => log.error('Failed to load comments', { error: String(err) }))
      .finally(() => setLoadingComments(false))
  }, [token, owner, repoName, issue.number])

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentBody.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const c = await createComment(token, owner, repoName, issue.number, commentBody.trim())
      setComments((prev) => [...prev, c as Comment])
      setCommentBody('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment'
      log.error('Create comment failed', { error: msg })
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleState() {
    const newState = issue.state === 'open' ? 'closed' : 'open'
    setClosing(true)
    try {
      await updateIssueState(token, owner, repoName, issue.number, newState)
      setIssue((prev) => ({ ...prev, state: newState }))
    } catch (err) {
      log.error('Failed to update issue state', { error: String(err) })
    } finally {
      setClosing(false)
    }
  }

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Issues</button>
        <div style={s.headerRight}>
          <StateBadge state={issue.state} />
          <span style={s.issueNum}>#{issue.number}</span>
          <a href={issue.html_url} target="_blank" rel="noreferrer" style={s.extLink}><LinkIcon /></a>
        </div>
      </header>

      <div style={s.body}>
        {/* ── Title ── */}
        <h1 style={s.title}>{issue.title}</h1>

        {/* ── Author meta ── */}
        <div style={s.meta}>
          {issue.user && <img src={issue.user.avatar_url} alt={issue.user.login} style={s.avatar} />}
          <span style={s.metaText}>
            <strong>{issue.user?.login ?? 'unknown'}</strong>
            {' opened '}{relativeTime(issue.created_at)}
            {comments.length > 0 && ` · ${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* ── Sidebar sections ── */}
        <div style={s.sidebar}>
          {/* Labels */}
          <div style={s.sideSection}>
            <div style={s.sideHeader}>
              <span style={s.sideTitle}>Labels</span>
              <button style={s.gearBtn} onClick={() => setShowLabelPicker(true)}><GearIcon /></button>
            </div>
            {issue.labels.length === 0 ? (
              <span style={s.none}>None yet</span>
            ) : (
              <div style={s.labelRow}>
                {issue.labels.map((l) => (
                  <span key={l.name} style={{ ...s.label, background: `#${l.color}26`, color: `#${l.color}`, border: `1px solid #${l.color}55` }}>
                    {l.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Milestone */}
          <div style={s.sideSection}>
            <div style={s.sideHeader}>
              <span style={s.sideTitle}>Milestone</span>
              <button style={s.gearBtn} onClick={() => setShowMilestonePicker(true)}><GearIcon /></button>
            </div>
            {issue.milestone ? (
              <span style={s.milestoneVal}>🏁 {issue.milestone.title}</span>
            ) : (
              <span style={s.none}>No milestone</span>
            )}
          </div>

          {/* Sub-issues */}
          <SubIssues token={token} owner={owner} repo={repoName} issueNumber={issue.number} />
        </div>

        {/* ── Issue body ── */}
        <div style={s.issueBody}>
          <div style={s.bodyHeader}>
            {issue.user && <img src={issue.user.avatar_url} alt={issue.user.login} style={s.avatarMd} />}
            <div style={s.bodyMeta}>
              <strong style={s.bodyAuthor}>{issue.user?.login ?? 'unknown'}</strong>
              <span style={s.bodyDate}> commented {relativeTime(issue.created_at)}</span>
            </div>
          </div>
          {issue.body ? (
            <pre style={s.bodyText}>{issue.body}</pre>
          ) : (
            <p style={s.noBody}>No description provided.</p>
          )}
        </div>

        {/* ── Comments ── */}
        {loadingComments ? (
          <p style={s.muted}>Loading comments…</p>
        ) : comments.map((c) => (
          <div key={c.id} style={s.commentCard}>
            <div style={s.bodyHeader}>
              {c.user && <img src={c.user.avatar_url} alt={c.user.login} style={s.avatarMd} />}
              <div style={s.bodyMeta}>
                <strong style={s.bodyAuthor}>{c.user?.login ?? 'unknown'}</strong>
                <span style={s.bodyDate}> commented {relativeTime(c.created_at)}</span>
              </div>
            </div>
            <pre style={s.bodyText}>{c.body ?? ''}</pre>
          </div>
        ))}

        {/* ── Comment form ── */}
        <form style={s.commentForm} onSubmit={handleComment}>
          <div style={s.formHeader}>
            <span style={s.formTitle}>Leave a comment</span>
          </div>
          <textarea
            style={s.textarea}
            placeholder="Leave a comment…"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={4}
          />
          {error && <p style={s.error}>{error}</p>}
          <div style={s.formActions}>
            <button
              type="button"
              style={{ ...s.stateBtn, ...(issue.state === 'closed' ? s.reopenBtn : s.closeBtn) }}
              onClick={toggleState}
              disabled={closing}
            >
              {closing ? '…' : issue.state === 'open' ? 'Close issue' : 'Reopen issue'}
            </button>
            <button
              style={{ ...s.submitBtn, opacity: submitting || !commentBody.trim() ? 0.5 : 1 }}
              type="submit"
              disabled={submitting || !commentBody.trim()}
            >
              {submitting ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </form>
      </div>

      {showLabelPicker && (
        <LabelPicker
          token={token} owner={owner} repo={repoName} issueNumber={issue.number}
          currentLabels={issue.labels}
          onClose={() => setShowLabelPicker(false)}
          onSaved={(labels) => setIssue((prev) => ({ ...prev, labels }))}
        />
      )}
      {showMilestonePicker && (
        <MilestonePicker
          token={token} owner={owner} repo={repoName} issueNumber={issue.number}
          currentMilestone={issue.milestone}
          onClose={() => setShowMilestonePicker(false)}
          onSaved={(milestone) => setIssue((prev) => ({ ...prev, milestone }))}
        />
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'system-ui, sans-serif' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.75rem 1rem', borderBottom: '1px solid #21262d', background: '#161b22', gap: '0.5rem', flexWrap: 'wrap',
  },
  backBtn: { background: 'transparent', color: '#58a6ff', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  issueNum: { color: '#8b949e', fontSize: '0.85rem' },
  extLink: { color: '#8b949e', display: 'flex', alignItems: 'center' },
  body: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '760px', margin: '0 auto' },
  title: { fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.4, margin: 0 },
  meta: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  avatar: { width: 20, height: 20, borderRadius: '50%' },
  avatarMd: { width: 30, height: 30, borderRadius: '50%', flexShrink: 0 },
  metaText: { fontSize: '0.82rem', color: '#8b949e' },

  sidebar: {
    background: '#161b22', border: '1px solid #21262d', borderRadius: '8px',
    padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem',
  },
  sideSection: {},
  sideHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' },
  sideTitle: { fontSize: '0.72rem', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em' },
  gearBtn: { background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '0.1rem', display: 'flex', alignItems: 'center' },
  none: { fontSize: '0.82rem', color: '#8b949e' },
  labelRow: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem' },
  label: { fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 500 },
  milestoneVal: { fontSize: '0.82rem', color: '#e6edf3' },

  issueBody: { background: '#161b22', border: '1px solid #21262d', borderRadius: '8px', overflow: 'hidden' },
  commentCard: { background: '#161b22', border: '1px solid #21262d', borderRadius: '8px', overflow: 'hidden' },
  bodyHeader: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', borderBottom: '1px solid #21262d', background: '#1c2128' },
  bodyMeta: { fontSize: '0.82rem' },
  bodyAuthor: { color: '#e6edf3' },
  bodyDate: { color: '#8b949e' },
  bodyText: { fontSize: '0.875rem', color: '#c9d1d9', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit', padding: '0.85rem' },
  noBody: { color: '#8b949e', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.85rem', margin: 0 },

  muted: { color: '#8b949e', fontSize: '0.85rem' },

  commentForm: { background: '#161b22', border: '1px solid #21262d', borderRadius: '8px', overflow: 'hidden' },
  formHeader: { padding: '0.5rem 0.85rem', borderBottom: '1px solid #21262d', background: '#1c2128' },
  formTitle: { fontSize: '0.78rem', color: '#8b949e', fontWeight: 600 },
  textarea: {
    width: '100%', background: '#0d1117', border: 'none', borderBottom: '1px solid #21262d',
    color: '#e6edf3', fontSize: '0.9rem', padding: '0.75rem 0.85rem', outline: 'none',
    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box', display: 'block',
  },
  formActions: { display: 'flex', gap: '0.5rem', padding: '0.75rem 0.85rem', justifyContent: 'flex-end' },
  stateBtn: { border: '1px solid', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  closeBtn: { background: 'transparent', color: '#8b949e', borderColor: '#30363d' },
  reopenBtn: { background: 'transparent', color: '#1f883d', borderColor: '#1f883d' },
  submitBtn: { background: '#238636', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  error: { color: '#f85149', fontSize: '0.82rem', margin: '0', padding: '0 0.85rem 0.5rem' },
}
