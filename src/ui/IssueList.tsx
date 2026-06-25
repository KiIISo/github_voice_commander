import { useEffect, useState } from 'react'
import { fetchIssues } from '../api/github'
import { log } from '../logger'
import IssueDetail from './IssueDetail'
import NewIssueForm from './NewIssueForm'

export interface Issue {
  id: number
  number: number
  title: string
  body: string | null
  html_url: string
  created_at: string
  state: 'open' | 'closed'
  user: { login: string; avatar_url: string } | null
  labels: Array<{ name: string; color: string }>
  milestone: { number: number; title: string } | null
  comments: number
}

export interface RepoRef {
  name: string
  full_name: string
  html_url: string
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

export default function IssueList({
  repo,
  token,
  onBack,
}: {
  repo: RepoRef
  token: string
  onBack: () => void
}) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [showNewIssue, setShowNewIssue] = useState(false)

  const [owner, repoName] = repo.full_name.split('/')

  function loadIssues() {
    setLoading(true)
    fetchIssues(token, owner, repoName)
      .then((data) => setIssues(data as Issue[]))
      .catch((err: unknown) => log.error('Failed to load issues', { error: String(err) }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadIssues() }, [token, owner, repoName]) // eslint-disable-line react-hooks/exhaustive-deps

  if (selectedIssue) {
    return (
      <IssueDetail
        issue={selectedIssue}
        repo={repo}
        token={token}
        onBack={() => setSelectedIssue(null)}
      />
    )
  }

  if (showNewIssue) {
    return (
      <NewIssueForm
        repo={repo}
        token={token}
        onCancel={() => setShowNewIssue(false)}
        onCreated={() => {
          setShowNewIssue(false)
          loadIssues()
        }}
      />
    )
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Repositories</button>
        <div style={s.repoTitle}>
          <span style={s.repoName}>{repo.name}</span>
          <a href={repo.html_url} target="_blank" rel="noreferrer" style={s.headerLink} title="Open on GitHub">
            <LinkIcon />
          </a>
        </div>
        <button style={s.newBtn} onClick={() => setShowNewIssue(true)}>+ New Issue</button>
      </header>

      <main style={s.main}>
        <h2 style={s.sectionTitle}>Open Issues {!loading && `(${issues.length})`}</h2>

        {loading ? (
          <p style={s.muted}>Loading…</p>
        ) : issues.length === 0 ? (
          <p style={s.muted}>No open issues — all clear.</p>
        ) : (
          <div style={s.list}>
            {issues.map((issue) => (
              <div
                key={issue.id}
                style={s.card}
                onClick={() => setSelectedIssue(issue)}
              >
                <div style={s.cardTop}>
                  <span style={s.num}>#{issue.number}</span>
                  <span style={s.title}>{issue.title}</span>
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={s.linkIcon}
                    title="Open on GitHub"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkIcon />
                  </a>
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

                <div style={s.meta}>
                  <span>by {issue.user?.login ?? 'unknown'}</span>
                  <span style={s.dot}>·</span>
                  <span>{relativeTime(issue.created_at)}</span>
                  {issue.comments > 0 && (
                    <>
                      <span style={s.dot}>·</span>
                      <span>💬 {issue.comments}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'system-ui, sans-serif' },
  header: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
    padding: '1rem', borderBottom: '1px solid #21262d', background: '#161b22',
  },
  backBtn: {
    background: 'transparent', color: '#58a6ff', border: 'none',
    cursor: 'pointer', fontSize: '0.9rem', padding: 0, marginRight: 'auto',
  },
  repoTitle: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  repoName: { fontWeight: 700, fontSize: '1rem' },
  headerLink: { color: '#8b949e', display: 'flex', alignItems: 'center' },
  newBtn: {
    background: '#238636', color: '#fff', border: 'none', borderRadius: '6px',
    padding: '0.4rem 0.75rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
  },
  main: { padding: '1rem' },
  sectionTitle: {
    fontSize: '0.75rem', fontWeight: 600, margin: '0 0 1rem',
    color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  muted: { color: '#8b949e', fontSize: '0.9rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  card: {
    background: '#161b22', border: '1px solid #21262d',
    borderRadius: '8px', padding: '0.85rem 1rem', cursor: 'pointer',
  },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' },
  num: { color: '#8b949e', fontSize: '0.8rem', flexShrink: 0, paddingTop: '2px' },
  title: { flex: 1, fontWeight: 500, fontSize: '0.92rem', lineHeight: 1.4 },
  linkIcon: { color: '#8b949e', display: 'flex', alignItems: 'center', flexShrink: 0, paddingTop: '2px' },
  labels: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' },
  label: { fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '20px', fontWeight: 500 },
  meta: { display: 'flex', gap: '0.4rem', fontSize: '0.75rem', color: '#8b949e', flexWrap: 'wrap' },
  dot: { color: '#484f58' },
}
