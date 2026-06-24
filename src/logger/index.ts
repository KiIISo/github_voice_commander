const STORAGE_KEY = 'gvc-logs'
const MAX_ENTRIES = 200

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
}

function safeStringify(val: unknown): string {
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

function readLogs(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as LogEntry[]
  } catch {
    return []
  }
}

function write(level: LogLevel, message: string, context?: unknown) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context !== undefined ? { context: safeStringify(context) } : {}),
  }

  const consoleFn =
    level === 'debug' ? console.debug
    : level === 'info' ? console.info
    : level === 'warn' ? console.warn
    : console.error
  consoleFn(`[GVC ${level.toUpperCase()}] ${message}`, context ?? '')

  const logs = readLogs()
  logs.push(entry)
  if (logs.length > MAX_ENTRIES) logs.splice(0, logs.length - MAX_ENTRIES)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch {
    // localStorage quota hit — clear and retry once
    localStorage.removeItem(STORAGE_KEY)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry]))
  }
}

export const log = {
  debug: (message: string, context?: unknown) => write('debug', message, context),
  info:  (message: string, context?: unknown) => write('info',  message, context),
  warn:  (message: string, context?: unknown) => write('warn',  message, context),
  error: (message: string, context?: unknown) => write('error', message, context),
  getLogs: readLogs,
  clear: () => localStorage.removeItem(STORAGE_KEY),
}
