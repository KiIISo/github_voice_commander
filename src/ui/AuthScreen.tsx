import { useState, useRef } from 'react'
import { requestDeviceCode, pollForToken, type DeviceCodeResponse } from '../auth/deviceFlow'
import { fetchUser } from '../api/github'
import { useAccountStore, type Account } from '../store/accounts'

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID

interface Props {
  reconnectAccount?: Account
}

export default function AuthScreen({ reconnectAccount }: Props) {
  const [step, setStep] = useState<'idle' | 'pending' | 'polling' | 'error'>('idle')
  const [deviceData, setDeviceData] = useState<DeviceCodeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const addAccount = useAccountStore((s) => s.addAccount)

  async function startFlow() {
    setStep('pending')
    setError(null)
    try {
      const data = await requestDeviceCode(CLIENT_ID)
      setDeviceData(data)
      setStep('polling')

      abortRef.current = new AbortController()
      const tokenRes = await pollForToken(CLIENT_ID, data.device_code, data.interval, abortRef.current.signal)
      const user = await fetchUser(tokenRes.access_token)

      addAccount(
        { login: user.login, name: user.name ?? null, avatarUrl: user.avatar_url },
        tokenRes.access_token,
      )
    } catch (err) {
      if (err instanceof Error && err.message === 'Aborted') return
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('error')
    }
  }

  function cancel() {
    abortRef.current?.abort()
    setStep('idle')
    setDeviceData(null)
  }

  return (
    <div style={s.container}>
      <h1 style={s.title}>GitHub Voice Commander</h1>

      {reconnectAccount ? (
        <p style={s.subtitle}>
          Session expired — reconnect as <strong>@{reconnectAccount.login}</strong>
        </p>
      ) : (
        <p style={s.subtitle}>Connect your GitHub account to get started</p>
      )}

      {step === 'idle' && (
        <button style={s.btn} onClick={startFlow}>
          {reconnectAccount ? 'Reconnect GitHub Account' : 'Connect GitHub Account'}
        </button>
      )}

      {step === 'pending' && <p style={s.muted}>Requesting device code…</p>}

      {step === 'polling' && deviceData && (
        <div style={s.card}>
          <p style={s.muted}>1. Open this URL on any device:</p>
          <code style={s.url}>{deviceData.verification_uri}</code>
          <p style={s.muted}>2. Enter this code:</p>
          <code style={s.code}>{deviceData.user_code}</code>
          <p style={s.waiting}>Waiting for authorization…</p>
          <button style={s.cancelBtn} onClick={cancel}>Cancel</button>
        </div>
      )}

      {step === 'error' && (
        <div style={{ textAlign: 'center' }}>
          <p style={s.error}>{error}</p>
          <button style={s.btn} onClick={startFlow}>Try Again</button>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    fontFamily: 'system-ui, sans-serif',
    background: '#0d1117',
    color: '#e6edf3',
  },
  title: { fontSize: '1.8rem', fontWeight: 700, margin: '0 0 0.5rem' },
  subtitle: { color: '#8b949e', margin: '0 0 2rem', textAlign: 'center' },
  btn: {
    background: '#238636', color: '#fff', border: 'none',
    padding: '0.75rem 1.5rem', borderRadius: '6px',
    fontSize: '1rem', cursor: 'pointer', fontWeight: 600,
  },
  cancelBtn: {
    background: 'transparent', color: '#8b949e', border: '1px solid #30363d',
    padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', marginTop: '1rem',
  },
  card: {
    background: '#161b22', border: '1px solid #30363d', borderRadius: '8px',
    padding: '1.5rem', textAlign: 'center', maxWidth: '360px', width: '100%',
  },
  muted: { color: '#8b949e', fontSize: '0.9rem', margin: '0.5rem 0' },
  url: { display: 'block', color: '#58a6ff', fontSize: '1rem', margin: '0.5rem 0' },
  code: {
    display: 'block', fontSize: '2rem', fontWeight: 700,
    letterSpacing: '0.3em', color: '#e6edf3', margin: '0.5rem 0 1rem',
  },
  waiting: { color: '#8b949e', fontSize: '0.85rem' },
  error: { color: '#f85149', marginBottom: '1rem' },
}
