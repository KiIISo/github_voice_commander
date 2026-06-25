import { useEffect, useState } from 'react'
import { fetchRepos } from '../api/github'
import { useAccountStore, type Account } from '../store/accounts'
import { log } from '../logger'
import LogViewer from './LogViewer'
import IssueList, { type RepoRef } from './IssueList'

interface Repo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  language: string | null
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

export default function Dashboard({ account }: { account: Account }) {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogs, setShowLogs] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<RepoRef | null>(null)
  const { accounts, activeLogin, setActive, removeAccount } = useAccountStore()

  useEffect(() => {
    setLoading(true)
    fetchRepos(account.token)
      .then((data) => setRepos(data as Repo[]))
      .catch((err: unknown) => {
        log.error('Failed to load repositories', { error: String(err) })
      })
      .finally(() => setLoading(false))
  }, [account.token])

  if (selectedRepo) {
    return (
      <IssueList
        repo={selectedRepo}
        token={account.token}
        onBack={() => setSelectedRepo(null)}
      />
    )
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <img src={account.avatarUrl} alt={account.login} style={s.avatar} />
          <div>
            <div style={s.name}>{account.name ?? account.login}</div>
            <div style={s.login}>@{account.login}</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <button style={s.logsBtn} onClick={() => setShowLogs(true)}>Logs</button>
          <button style={s.disconnectBtn} onClick={() => removeAccount(account.login)}>Disconnect</button>
        </div>
      </header>

      {accounts.length > 1 && (
        <div style={s.switcher}>
          {accounts.map((a) => (
            <button
              key={a.login}
              style={{ ...s.switchBtn, ...(a.login === activeLogin ? s.switchBtnActive : {}) }}
              onClick={() => setActive(a.login)}
            >
              {a.login}
            </button>
          ))}
        </div>
      )}

      <main style={s.main}>
        <h2 style={s.sectionTitle}>Repositories</h2>
        {loading ? (
          <p style={s.muted}>Loading…</p>
        ) : (
          <div style={s.list}>
            {repos.map((repo) => (
              <div
                key={repo.id}
                style={s.card}
                onClick={() => setSelectedRepo({ name: repo.name, full_name: repo.full_name, html_url: repo.html_url })}
              >
                <div style={s.cardTop}>
                  <span style={s.repoName}>{repo.name}</span>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={s.linkIcon}
                    title="Open on GitHub"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkIcon />
                  </a>
                </div>
                {repo.description && <div style={s.desc}>{repo.description}</div>}
                <div style={s.meta}>
                  {repo.language && <span style={s.lang}>{repo.language}</span>}
                  <span>⭐ {repo.stargazers_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showLogs && <LogViewer onClose={() => setShowLogs(false)} />}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'system-ui, sans-serif' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem', borderBottom: '1px solid #21262d', background: '#161b22',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  avatar: { width: 40, height: 40, borderRadius: '50%' },
  name: { fontWeight: 600, fontSize: '1rem' },
  login: { color: '#8b949e', fontSize: '0.85rem' },
  logsBtn: {
    background: 'transparent', color: '#8b949e', border: '1px solid #30363d',
    padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
  },
  disconnectBtn: {
    background: 'transparent', color: '#f85149', border: '1px solid #f85149',
    padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem',
  },
  switcher: { display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid #21262d' },
  switchBtn: {
    background: 'transparent', color: '#8b949e', border: '1px solid #30363d',
    padding: '0.3rem 0.75rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem',
  },
  switchBtnActive: { background: '#1f6feb', color: '#fff', borderColor: '#1f6feb' },
  main: { padding: '1rem' },
  sectionTitle: {
    fontSize: '0.75rem', fontWeight: 600, margin: '0 0 1rem',
    color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  muted: { color: '#8b949e' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  card: {
    background: '#161b22', border: '1px solid #21262d', borderRadius: '8px',
    padding: '1rem', cursor: 'pointer',
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' },
  repoName: { fontWeight: 600, color: '#58a6ff' },
  linkIcon: { color: '#8b949e', display: 'flex', alignItems: 'center', padding: '0.25rem' },
  desc: { color: '#8b949e', fontSize: '0.85rem', marginBottom: '0.5rem' },
  meta: { display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#8b949e' },
  lang: { color: '#e3b341' },
}
