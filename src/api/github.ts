import { Octokit } from 'octokit'

export function createOctokit(token: string) {
  return new Octokit({ auth: token })
}

export async function fetchUser(token: string) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.users.getAuthenticated()
  return data
}

export async function fetchRepos(token: string) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 50,
  })
  return data
}
