import { useAccountStore } from './store/accounts'
import AuthScreen from './ui/AuthScreen'
import Dashboard from './ui/Dashboard'

export default function App() {
  const { accounts, activeLogin, getToken } = useAccountStore()
  const activeAccount = accounts.find((a) => a.login === activeLogin) ?? null
  const token = activeAccount ? getToken(activeAccount.login) : undefined

  if (!activeAccount) return <AuthScreen />

  // Account known but no session token (new browser session) — prompt reconnect
  if (!token) return <AuthScreen reconnectAccount={activeAccount} />

  return <Dashboard account={activeAccount} token={token} />
}
