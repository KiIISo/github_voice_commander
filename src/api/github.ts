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

export async function createIssue(token: string, owner: string, repo: string, title: string, body: string) {
  log.info('Creating issue', { owner, repo, title })
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.create({ owner, repo, title, body })
  log.info('Issue created', { number: data.number })
  return data
}

export async function fetchComments(token: string, owner: string, repo: string, issueNumber: number) {
  log.debug('Fetching comments', { owner, repo, issueNumber })
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.listComments({
    owner, repo, issue_number: issueNumber, per_page: 50,
  })
  return data
}

export async function createComment(token: string, owner: string, repo: string, issueNumber: number, body: string) {
  log.info('Creating comment', { owner, repo, issueNumber })
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.createComment({
    owner, repo, issue_number: issueNumber, body,
  })
  log.info('Comment created', { id: data.id })
  return data
}

export async function fetchIssues(token: string, owner: string, repo: string) {
  log.debug('Fetching issues', { owner, repo })
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    per_page: 50,
  })
  log.info('Issues fetched', { count: data.length, repo: `${owner}/${repo}` })
  return data
}
