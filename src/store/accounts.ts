import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Account {
  login: string
  name: string | null
  avatarUrl: string
  token: string
}

interface AccountStore {
  accounts: Account[]
  activeLogin: string | null
  addAccount: (account: Account) => void
  removeAccount: (login: string) => void
  setActive: (login: string) => void
}

export const useAccountStore = create<AccountStore>()(
  persist(
    (set) => ({
      accounts: [],
      activeLogin: null,
      addAccount: (account) =>
        set((state) => ({
          accounts: state.accounts.some((a) => a.login === account.login)
            ? state.accounts.map((a) => (a.login === account.login ? account : a))
            : [...state.accounts, account],
          activeLogin: account.login,
        })),
      removeAccount: (login) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.login !== login),
          activeLogin:
            state.activeLogin === login
              ? (state.accounts.find((a) => a.login !== login)?.login ?? null)
              : state.activeLogin,
        })),
      setActive: (login) => set({ activeLogin: login }),
    }),
    { name: 'gvc-accounts' },
  ),
)
