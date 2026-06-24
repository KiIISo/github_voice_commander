import { useAccountStore } from './store/accounts'
import AuthScreen from './ui/AuthScreen'
import Dashboard from './ui/Dashboard'

export default function App() {
  const { accounts, activeLogin } = useAccountStore()
  const activeAccount = accounts.find((a) => a.login === activeLogin) ?? null

  return activeAccount ? <Dashboard account={activeAccount} /> : <AuthScreen />
}
