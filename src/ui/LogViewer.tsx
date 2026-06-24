import { useState, useEffect } from 'react'
import { log, type LogEntry, type LogLevel } from '../logger'

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: '#8b949e',
  info:  '#58a6ff',
  warn:  '#e3b341',
  error: '#f85149',
}

export default function LogViewer({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogLevel | 'all'>('all')

  useEffect(() => {
    setEntries(log.getLogs().slice().reverse())
  }, [])

  function handleClear() {
    log.clear()
    setEntries([])
  }

  const visible = filter === 'all' ? entries : entries.filter((e) => e.level === filter)

  return (
    <div style={s.overlay}>
      <div style={s.panel}>
        <div style={s.toolbar}>
          <span style={s.title}>Logs ({entries.length})</span>
          <div style={s.filters}>
            {(['all', 'error', 'warn', 'info', 'debug'] as const).map((lvl) => (
              <button
                key={lvl}
                style={{ ...s.filterBtn, ...(filter === lvl ? s.filterActive : {}) }}
                onClick={() => setFilter(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
          <button style={s.clearBtn} onClick={handleClear}>Clear</button>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.list}>
          {visible.length === 0 ? (
            <p style={s.empty}>No logs.</p>
          ) : (
            visible.map((entry, i) => (
              <div key={i} style={s.entry}>
                <div style={s.entryHeader}>
                  <span style={{ ...s.level, color: LEVEL_COLOR[entry.level] }}>
                    {entry.level.toUpperCase()}
                  </span>
                  <span style={s.time}>
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </span>
                  <span style={s.msg}>{entry.message}</span>
                </div>
                {entry.context && (
                  <pre style={s.ctx}>{entry.context}</pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'flex-end', zIndex: 100,
  },
  panel: {
    width: '100%', maxHeight: '75vh', background: '#161b22',
    borderTop: '2px solid #30363d', display: 'flex', flexDirection: 'column',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
    padding: '0.75rem 1rem', borderBottom: '1px solid #21262d', background: '#0d1117',
  },
  title: { fontWeight: 700, fontSize: '0.85rem', color: '#e6edf3', marginRight: 'auto' },
  filters: { display: 'flex', gap: '0.25rem' },
  filterBtn: {
    background: 'transparent', color: '#8b949e', border: '1px solid #30363d',
    padding: '0.15rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem',
  },
  filterActive: { background: '#1f6feb', color: '#fff', borderColor: '#1f6feb' },
  clearBtn: {
    background: 'transparent', color: '#f85149', border: '1px solid #f85149',
    padding: '0.15rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem',
  },
  closeBtn: {
    background: 'transparent', color: '#8b949e', border: 'none',
    cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
  },
  list: { overflowY: 'auto', flex: 1, padding: '0.5rem 1rem' },
  empty: { color: '#8b949e', fontSize: '0.85rem', padding: '1rem 0' },
  entry: {
    borderBottom: '1px solid #21262d', padding: '0.4rem 0',
    fontFamily: 'monospace', fontSize: '0.78rem',
  },
  entryHeader: { display: 'flex', gap: '0.6rem', alignItems: 'baseline', flexWrap: 'wrap' },
  level: { fontWeight: 700, minWidth: '3.5rem' },
  time: { color: '#484f58', flexShrink: 0 },
  msg: { color: '#e6edf3' },
  ctx: {
    color: '#8b949e', fontSize: '0.72rem', marginTop: '0.25rem',
    paddingLeft: '4.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
  },
}
