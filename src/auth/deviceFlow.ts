const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const TOKEN_URL = 'https://github.com/login/oauth/access_token'

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
  const res = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: 'repo user' }),
  })
  if (!res.ok) throw new Error(`Device code request failed: ${res.status}`)
  return res.json() as Promise<DeviceCodeResponse>
}

export async function pollForToken(
  clientId: string,
  deviceCode: string,
  interval: number,
  signal: AbortSignal,
): Promise<TokenResponse> {
  let pollInterval = interval * 1000

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
        return resolve(data)
      }

      if (data.error === 'slow_down') {
        pollInterval = (data.interval + 5) * 1000
      } else if (data.error === 'expired_token') {
        return reject(new Error('Device code expired. Please try again.'))
      } else if (data.error === 'access_denied') {
        return reject(new Error('Access denied.'))
      }

      setTimeout(() => { poll().catch(reject) }, pollInterval)
    }

    setTimeout(() => { poll().catch(reject) }, pollInterval)
  })
}
