import { Octokit } from 'octokit'
import { log } from '../logger'

export function createOctokit(token: string) {
  return new Octokit({ auth: token })
}

export async function fetchUser(token: string) {
  log.debug('Fetching authenticated user')
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.users.getAuthenticated()
  log.info('User fetched', { login: data.login })
  return data
}

export async function fetchRepos(token: string) {
  log.debug('Fetching repositories')
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 50,
  })
  log.info('Repositories fetched', { count: data.length })
  return data
}
