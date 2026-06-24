import { log } from '../logger'

// Routed through a local proxy to avoid CORS restrictions on GitHub's OAuth endpoints
const DEVICE_CODE_URL = '/api/github/login/device/code'
const TOKEN_URL = '/api/github/login/oauth/access_token'

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface TokenResponse {
  access_token: string
  token_type: string
  scope: string
}

type PollError =
  | { error: 'authorization_pending' }
  | { error: 'slow_down'; interval: number }
  | { error: 'expired_token' }
  | { error: 'access_denied' }

export async function requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
  log.info('Requesting device code from GitHub')
  const res = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: 'repo user' }),
  })
  if (!res.ok) {
    log.error('Device code request failed', { status: res.status })
    throw new Error(`Device code request failed: ${res.status}`)
  }
  const data = await res.json() as DeviceCodeResponse
  log.info('Device code received', { verification_uri: data.verification_uri, expires_in: data.expires_in })
  return data
}

export async function pollForToken(
  clientId: string,
  deviceCode: string,
  interval: number,
  signal: AbortSignal,
): Promise<TokenResponse> {
  let pollInterval = interval * 1000
  log.debug('Starting token poll', { interval_s: interval })

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (signal.aborted) return reject(new Error('Aborted'))

      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      })

      const data = (await res.json()) as TokenResponse | PollError

      if ('access_token' in data) {
        log.info('Token received successfully')
        return resolve(data)
      }

      if (data.error === 'authorization_pending') {
        log.debug('Authorization pending — retrying')
      } else if (data.error === 'slow_down') {
        pollInterval = (data.interval + 5) * 1000
        log.warn('Rate limited by GitHub, slowing poll', { new_interval_s: pollInterval / 1000 })
      } else if (data.error === 'expired_token') {
        log.error('Device code expired')
        return reject(new Error('Device code expired. Please try again.'))
      } else if (data.error === 'access_denied') {
        log.warn('User denied authorization')
        return reject(new Error('Access denied.'))
      }

      setTimeout(() => { poll().catch(reject) }, pollInterval)
    }

    setTimeout(() => { poll().catch(reject) }, pollInterval)
  })
}
