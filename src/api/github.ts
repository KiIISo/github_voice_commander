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

export async function fetchRepoLabels(token: string, owner: string, repo: string) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.listLabelsForRepo({ owner, repo, per_page: 100 })
  return data
}

export async function setIssueLabels(token: string, owner: string, repo: string, issueNumber: number, labels: string[]) {
  log.info('Setting labels', { issueNumber, labels })
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.setLabels({ owner, repo, issue_number: issueNumber, labels })
  return data
}

export async function fetchMilestones(token: string, owner: string, repo: string) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.listMilestones({ owner, repo, state: 'open' })
  return data
}

export async function setIssueMilestone(token: string, owner: string, repo: string, issueNumber: number, milestone: number | null) {
  log.info('Setting milestone', { issueNumber, milestone })
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.update({
    owner, repo, issue_number: issueNumber,
    milestone: milestone as number,
  })
  return data
}

export async function updateIssueState(token: string, owner: string, repo: string, issueNumber: number, state: 'open' | 'closed') {
  log.info('Updating issue state', { issueNumber, state })
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.update({ owner, repo, issue_number: issueNumber, state })
  return data
}

export async function fetchIssueByNumber(token: string, owner: string, repo: string, issueNumber: number) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber })
  return data
}

export async function fetchSubIssues(token: string, owner: string, repo: string, issueNumber: number) {
  const octokit = createOctokit(token)
  const result = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
    owner, repo, issue_number: issueNumber,
    headers: { 'X-GitHub-Api-Version': '2022-11-28' },
  })
  return result.data as SubIssueItem[]
}

export async function addSubIssue(token: string, owner: string, repo: string, issueNumber: number, subIssueId: number) {
  log.info('Adding sub-issue', { issueNumber, subIssueId })
  const octokit = createOctokit(token)
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
    owner, repo, issue_number: issueNumber,
    sub_issue_id: subIssueId,
    headers: { 'X-GitHub-Api-Version': '2022-11-28' },
  })
}

export async function removeSubIssue(token: string, owner: string, repo: string, issueNumber: number, subIssueId: number) {
  log.info('Removing sub-issue', { issueNumber, subIssueId })
  const octokit = createOctokit(token)
  await octokit.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/{sub_issue_id}', {
    owner, repo, issue_number: issueNumber, sub_issue_id: subIssueId,
    headers: { 'X-GitHub-Api-Version': '2022-11-28' },
  })
}

export interface SubIssueItem {
  id: number
  number: number
  title: string
  state: string
  html_url: string
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
