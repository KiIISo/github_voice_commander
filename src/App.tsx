import { useEffect, useState } from 'react'
import { useAccountStore } from './store/accounts'
import { fetchUser } from './api/github'
import { log } from './logger'
import AuthScreen from './ui/AuthScreen'
import Dashboard from './ui/Dashboard'

export default function App() {
  const { accounts, activeLogin, removeAccount } = useAccountStore()
  const activeAccount = accounts.find((a) => a.login === activeLogin) ?? null

  const [validating, setValidating] = useState(!!activeAccount)
  const [tokenValid, setTokenValid] = useState(false)

  useEffect(() => {
    if (!activeAccount) {
      setValidating(false)
      return
    }
    setValidating(true)
    fetchUser(activeAccount.token)
      .then(() => {
        log.debug('Stored token valid', { login: activeAccount.login })
        setTokenValid(true)
      })
      .catch(() => {
        log.warn('Stored token invalid or revoked', { login: activeAccount.login })
        setTokenValid(false)
      })
      .finally(() => setValidating(false))
  }, [activeAccount?.login]) // eslint-disable-line react-hooks/exhaustive-deps

  if (validating) {
    return (
      <div style={s.splash}>
        <span style={s.splashText}>Checking session…</span>
      </div>
    )
  }

  if (!activeAccount) return <AuthScreen />
  if (!tokenValid) return <AuthScreen reconnectAccount={activeAccount} />
  return <Dashboard account={activeAccount} />
}

const s: Record<string, React.CSSProperties> = {
  splash: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0d1117', fontFamily: 'system-ui, sans-serif',
  },
  splashText: { color: '#8b949e', fontSize: '0.9rem' },
}
