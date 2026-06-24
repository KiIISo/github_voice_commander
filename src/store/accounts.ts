import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Account {
  login: string
  name: string | null
  avatarUrl: string
}

// Tokens live in sessionStorage only — never written to localStorage/disk.
// sessionStorage survives page refresh but is cleared when the tab/browser closes,
// which limits the XSS exfiltration window to the active session.
const SESSION_KEY = 'gvc-tokens'

function readTokens(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function writeToken(login: string, token: string) {
  const tokens = readTokens()
  tokens[login] = token
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens))
}

function deleteToken(login: string) {
  const tokens = readTokens()
  delete tokens[login]
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens))
}

interface AccountStore {
  accounts: Account[]
  activeLogin: string | null
  addAccount: (account: Account, token: string) => void
  removeAccount: (login: string) => void
  setActive: (login: string) => void
  getToken: (login: string) => string | undefined
}

export const useAccountStore = create<AccountStore>()(
  persist(
    (set) => ({
      accounts: [],
      activeLogin: null,
      addAccount: (account, token) => {
        writeToken(account.login, token)
        set((state) => ({
          accounts: state.accounts.some((a) => a.login === account.login)
            ? state.accounts.map((a) => (a.login === account.login ? account : a))
            : [...state.accounts, account],
          activeLogin: account.login,
        }))
      },
      removeAccount: (login) => {
        deleteToken(login)
        set((state) => ({
          accounts: state.accounts.filter((a) => a.login !== login),
          activeLogin:
            state.activeLogin === login
              ? (state.accounts.find((a) => a.login !== login)?.login ?? null)
              : state.activeLogin,
        }))
      },
      setActive: (login) => set({ activeLogin: login }),
      getToken: (login) => readTokens()[login],
    }),
    {
      name: 'gvc-accounts',
      // Only persist non-sensitive metadata — tokens are excluded
      partialize: (state) => ({
        accounts: state.accounts,
        activeLogin: state.activeLogin,
      }),
    },
  ),
)
