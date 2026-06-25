import { useEffect, useState } from 'react'
import { fetchComments, createComment } from '../api/github'
import { log } from '../logger'
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
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function IssueDetail({
  issue,
  repo,
  token,
  onBack,
}: {
  issue: Issue
  repo: RepoRef
  token: string
  onBack: () => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [owner, repoName] = repo.full_name.split('/')

  useEffect(() => {
    setLoadingComments(true)
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
      const newComment = await createComment(token, owner, repoName, issue.number, commentBody.trim())
      setComments((prev) => [...prev, newComment as Comment])
      setCommentBody('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to post comment'
      log.error('Create comment failed', { error: msg })
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Issues</button>
        <div style={s.headerRight}>
          <span style={s.issueNum}>#{issue.number}</span>
          <a href={issue.html_url} target="_blank" rel="noreferrer" style={s.linkIcon} title="Open on GitHub">
            <LinkIcon />
          </a>
        </div>
      </header>

      <div style={s.content}>
        {/* Issue body */}
        <div style={s.issueCard}>
          <div style={s.issueTitle}>{issue.title}</div>

          <div style={s.issueMeta}>
            <img src={issue.user?.avatar_url} alt={issue.user?.login} style={s.avatar} />
            <span style={s.metaText}>
              <strong>{issue.user?.login ?? 'unknown'}</strong>
              {' opened '}{relativeTime(issue.created_at)}
            </span>
          </div>

          {issue.labels.length > 0 && (
            <div style={s.labels}>
              {issue.labels.map((label) => (
                <span
                  key={label.name}
                  style={{
                    ...s.label,
                    background: `#${label.color}26`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}55`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {issue.body ? (
            <pre style={s.body}>{issue.body}</pre>
          ) : (
            <p style={s.noBody}>No description provided.</p>
          )}
        </div>

        {/* Comments */}
        {loadingComments ? (
          <p style={s.muted}>Loading comments…</p>
        ) : comments.length > 0 ? (
          <div style={s.comments}>
            <div style={s.sectionTitle}>Comments ({comments.length})</div>
            {comments.map((comment) => (
              <div key={comment.id} style={s.commentCard}>
                <div style={s.commentHeader}>
                  <img src={comment.user?.avatar_url} alt={comment.user?.login} style={s.avatarSm} />
                  <span style={s.commentAuthor}>{comment.user?.login ?? 'unknown'}</span>
                  <span style={s.commentTime}>{relativeTime(comment.created_at)}</span>
                </div>
                <pre style={s.commentBody}>{comment.body ?? ''}</pre>
              </div>
            ))}
          </div>
        ) : null}

        {/* New comment form */}
        <form style={s.commentForm} onSubmit={handleComment}>
          <div style={s.sectionTitle}>Add a comment</div>
          <textarea
            style={s.textarea}
            placeholder="Leave a comment…"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={4}
          />
          {error && <p style={s.error}>{error}</p>}
          <button
            style={{ ...s.submitBtn, opacity: submitting || !commentBody.trim() ? 0.5 : 1 }}
            type="submit"
            disabled={submitting || !commentBody.trim()}
          >
            {submitting ? 'Posting…' : 'Comment'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'system-ui, sans-serif' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem', borderBottom: '1px solid #21262d', background: '#161b22',
  },
  backBtn: {
    background: 'transparent', color: '#58a6ff', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: 0,
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  issueNum: { color: '#8b949e', fontSize: '0.85rem' },
  linkIcon: { color: '#8b949e', display: 'flex', alignItems: 'center' },
  content: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  issueCard: { background: '#161b22', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' },
  issueTitle: { fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.75rem', lineHeight: 1.4 },
  issueMeta: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' },
  avatar: { width: 20, height: 20, borderRadius: '50%' },
  avatarSm: { width: 18, height: 18, borderRadius: '50%' },
  metaText: { fontSize: '0.8rem', color: '#8b949e' },
  labels: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' },
  label: { fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '20px', fontWeight: 500 },
  body: {
    fontSize: '0.875rem', color: '#c9d1d9', lineHeight: 1.6,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0.5rem 0 0', fontFamily: 'inherit',
  },
  noBody: { color: '#8b949e', fontSize: '0.85rem', margin: '0.5rem 0 0', fontStyle: 'italic' },
  muted: { color: '#8b949e', fontSize: '0.85rem' },
  comments: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  sectionTitle: {
    fontSize: '0.7rem', fontWeight: 600, color: '#8b949e',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem',
  },
  commentCard: { background: '#161b22', border: '1px solid #21262d', borderRadius: '8px', padding: '0.85rem' },
  commentHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
  commentAuthor: { fontWeight: 600, fontSize: '0.82rem' },
  commentTime: { color: '#8b949e', fontSize: '0.78rem', marginLeft: 'auto' },
  commentBody: {
    fontSize: '0.85rem', color: '#c9d1d9', lineHeight: 1.6,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit',
  },
  commentForm: { background: '#161b22', border: '1px solid #21262d', borderRadius: '8px', padding: '1rem' },
  textarea: {
    width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px',
    color: '#e6edf3', fontSize: '0.9rem', padding: '0.6rem 0.75rem', outline: 'none',
    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
    display: 'block', marginBottom: '0.75rem',
  },
  submitBtn: {
    background: '#238636', color: '#fff', border: 'none', borderRadius: '6px',
    padding: '0.6rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },
  error: { color: '#f85149', fontSize: '0.82rem', margin: '0 0 0.5rem' },
}
