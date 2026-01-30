import simpleGit, { SimpleGit, SimpleGitProgressEvent } from 'simple-git'
import { CommitInfo } from '../types'
import { SkillsManagerError, ErrorType } from '../utils/errors'

/**
 * Git 操作封装
 */
export class GitClient {
  private git: SimpleGit

  constructor(workDir?: string) {
    this.git = simpleGit(workDir)
  }

  /**
   * 克隆仓库
   */
  async cloneRepo(
    url: string,
    targetDir: string,
    options?: {
      token?: string
      branch?: string
      onProgress?: (event: SimpleGitProgressEvent) => void
    }
  ): Promise<void> {
    try {
      const authUrl = options?.token ? this.injectToken(url, options.token) : url

      if (options?.branch) {
        await this.git.clone(authUrl, targetDir, ['--branch', options.branch, '--single-branch'])
      } else {
        await this.git.clone(authUrl, targetDir)
      }
    } catch (error) {
      throw new SkillsManagerError(
        `Failed to clone repository: ${url}`,
        ErrorType.Network,
        'Check the URL, network connection, and authentication',
        { url, targetDir }
      )
    }
  }

  /**
   * 获取当前 commit 信息
   */
  async getCommitInfo(): Promise<CommitInfo> {
    try {
      const log = await this.git.log({ maxCount: 1 })
      const latest = log.latest

      if (!latest) {
        throw new SkillsManagerError('No commits found in repository', ErrorType.Generic)
      }

      const branches = await this.git.branch()
      const currentBranch = branches.current || 'main'

      return {
        hash: latest.hash,
        message: latest.message,
        date: latest.date,
        branch: currentBranch,
      }
    } catch (error) {
      if (error instanceof SkillsManagerError) throw error
      throw new SkillsManagerError(
        'Failed to get commit info',
        ErrorType.Generic,
        'Ensure the directory is a valid git repository'
      )
    }
  }

  /**
   * 拉取最新代码
   */
  async pullLatest(branch?: string): Promise<void> {
    try {
      if (branch) {
        await this.git.checkout(branch)
      }
      await this.git.pull()
    } catch (error) {
      throw new SkillsManagerError(
        'Failed to pull latest changes',
        ErrorType.Network,
        'Check network connection and authentication'
      )
    }
  }

  /**
   * 切换分支
   */
  async checkoutBranch(branch: string): Promise<void> {
    try {
      // 先检查远程是否有这个分支
      const branches = await this.git.branch(['-r'])
      const remoteBranches = Object.keys(branches.branches)

      const targetBranch = remoteBranches.find(b => b.endsWith(branch))

      if (targetBranch) {
        // 切换并跟踪远程分支
        await this.git.checkout(['-B', branch, `origin/${branch}`])
      } else {
        // 尝试切换本地分支
        await this.git.checkout(branch)
      }
    } catch (error) {
      throw new SkillsManagerError(
        `Failed to checkout branch: ${branch}`,
        ErrorType.Generic,
        'Check if the branch exists'
      )
    }
  }

  /**
   * 比较两个 commit 之间的差异
   */
  async diffCommits(from: string, to: string = 'HEAD'): Promise<string> {
    try {
      const diff = await this.git.diff([`${from}...${to}`])
      return diff
    } catch (error) {
      throw new SkillsManagerError(
        'Failed to get diff',
        ErrorType.Generic,
        'Ensure the commits exist'
      )
    }
  }

  /**
   * 检查是否有远程更新
   */
  async hasUpdates(): Promise<boolean> {
    try {
      await this.git.fetch()
      const status = await this.git.status()
      return status.behind > 0 || status.ahead > 0
    } catch (error) {
      throw new SkillsManagerError(
        'Failed to check for updates',
        ErrorType.Network,
        'Check network connection and authentication'
      )
    }
  }

  /**
   * 获取文件变更摘要
   */
  async getDiffSummary(from: string, to: string = 'HEAD'): Promise<DiffSummary> {
    try {
      const summary = await this.git.diffSummary([`${from}...${to}`])
      return {
        files: summary.files.map(f => ({
          file: f.file,
          changes: f.changes,
          insertions: f.insertions,
          deletions: f.deletions,
        })),
        changed: summary.changed,
        insertions: summary.insertions,
        deletions: summary.deletions,
      }
    } catch (error) {
      throw new SkillsManagerError(
        'Failed to get diff summary',
        ErrorType.Generic
      )
    }
  }

  /**
   * 在 URL 中注入 token
   */
  private injectToken(url: string, token: string): string {
    if (url.startsWith('https://')) {
      return url.replace('https://', `https://${token}@`)
    }
    return url
  }
}

export interface DiffFile {
  file: string
  changes: number
  insertions: number
  deletions: number
}

export interface DiffSummary {
  files: DiffFile[]
  changed: number
  insertions: number
  deletions: number
}
