import { describe, it, expect, vi } from 'vitest'
import { GitClient } from './git'
import { SkillsManagerError } from '../utils/errors'

// Mock simple-git
vi.mock('simple-git', () => {
  const mockGit = {
    clone: vi.fn(),
    log: vi.fn(),
    pull: vi.fn(),
    checkout: vi.fn(),
    diff: vi.fn(),
    fetch: vi.fn(),
    status: vi.fn(),
    diffSummary: vi.fn(),
    branch: vi.fn(),
  }

  return {
    default: vi.fn(() => mockGit),
    __mockGit: mockGit, // Export for access
  }
})

import simpleGit, { __mockGit as mockGit } from 'simple-git'

describe('GitClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cloneRepo', () => {
    it('should clone repository', async () => {
      mockGit.clone.mockResolvedValue(undefined)

      const client = new GitClient()
      await client.cloneRepo('https://github.com/test/repo.git', '/target/dir')

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/test/repo.git',
        '/target/dir'
      )
    })

    it('should clone with branch', async () => {
      mockGit.clone.mockResolvedValue(undefined)

      const client = new GitClient()
      await client.cloneRepo('https://github.com/test/repo.git', '/target/dir', {
        branch: 'develop',
      })

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/test/repo.git',
        '/target/dir',
        ['--branch', 'develop', '--single-branch']
      )
    })

    it('should inject token into URL', async () => {
      mockGit.clone.mockResolvedValue(undefined)

      const client = new GitClient()
      await client.cloneRepo('https://github.com/test/repo.git', '/target/dir', {
        token: 'abc123',
      })

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://abc123@github.com/test/repo.git',
        '/target/dir'
      )
    })

    it('should throw on clone error', async () => {
      mockGit.clone.mockRejectedValue(new Error('Network error'))

      const client = new GitClient()
      await expect(
        client.cloneRepo('https://github.com/test/repo.git', '/target/dir')
      ).rejects.toThrow(SkillsManagerError)
    })
  })

  describe('getCommitInfo', () => {
    it('should get commit info', async () => {
      mockGit.log.mockResolvedValue({
        latest: {
          hash: 'abc123',
          message: 'Test commit',
          date: '2024-01-01',
        },
        all: [],
      })
      mockGit.branch.mockResolvedValue({
        current: 'main',
        branches: {},
        all: [],
      })

      const client = new GitClient()
      const info = await client.getCommitInfo()

      expect(info.hash).toBe('abc123')
      expect(info.message).toBe('Test commit')
      expect(info.date).toBe('2024-01-01')
      expect(info.branch).toBe('main')
    })

    it('should throw when no commits', async () => {
      mockGit.log.mockResolvedValue({ latest: null, all: [] })

      const client = new GitClient()
      await expect(client.getCommitInfo()).rejects.toThrow(SkillsManagerError)
    })
  })

  describe('pullLatest', () => {
    it('should pull latest', async () => {
      mockGit.pull.mockResolvedValue(undefined)

      const client = new GitClient()
      await client.pullLatest()

      expect(mockGit.pull).toHaveBeenCalled()
    })

    it('should checkout branch before pull', async () => {
      mockGit.checkout.mockResolvedValue(undefined)
      mockGit.pull.mockResolvedValue(undefined)

      const client = new GitClient()
      await client.pullLatest('develop')

      expect(mockGit.checkout).toHaveBeenCalledWith('develop')
      expect(mockGit.pull).toHaveBeenCalled()
    })
  })

  describe('checkoutBranch', () => {
    it('should checkout branch', async () => {
      mockGit.branch.mockResolvedValue({
        branches: {
          'origin/develop': {} as any,
        },
        current: 'main',
        all: [],
      })
      mockGit.checkout.mockResolvedValue(undefined)

      const client = new GitClient()
      await client.checkoutBranch('develop')

      expect(mockGit.checkout).toHaveBeenCalledWith(['-B', 'develop', 'origin/develop'])
    })

    it('should throw on error', async () => {
      mockGit.branch.mockRejectedValue(new Error('Branch not found'))

      const client = new GitClient()
      await expect(client.checkoutBranch('nonexistent')).rejects.toThrow(SkillsManagerError)
    })
  })

  describe('diffCommits', () => {
    it('should get diff', async () => {
      const diffText = '--- a/file.js\n+++ b/file.js\n- old\n+ new'
      mockGit.diff.mockResolvedValue(diffText)

      const client = new GitClient()
      const diff = await client.diffCommits('abc123')

      expect(diff).toBe(diffText)
      expect(mockGit.diff).toHaveBeenCalledWith(['abc123...HEAD'])
    })

    it('should throw on error', async () => {
      mockGit.diff.mockRejectedValue(new Error('Invalid commit'))

      const client = new GitClient()
      await expect(client.diffCommits('abc123')).rejects.toThrow(SkillsManagerError)
    })
  })

  describe('hasUpdates', () => {
    it('should detect updates', async () => {
      mockGit.fetch.mockResolvedValue(undefined)
      mockGit.status.mockResolvedValue({ behind: 1, ahead: 0 } as any)

      const client = new GitClient()
      const hasUpdates = await client.hasUpdates()

      expect(hasUpdates).toBe(true)
    })

    it('should return false when up to date', async () => {
      mockGit.fetch.mockResolvedValue(undefined)
      mockGit.status.mockResolvedValue({ behind: 0, ahead: 0 } as any)

      const client = new GitClient()
      const hasUpdates = await client.hasUpdates()

      expect(hasUpdates).toBe(false)
    })
  })

  describe('getDiffSummary', () => {
    it('should get diff summary', async () => {
      mockGit.diffSummary.mockResolvedValue({
        files: [
          { file: 'test.js', changes: 2, insertions: 1, deletions: 1 },
        ],
        changed: 1,
        insertions: 1,
        deletions: 1,
      } as any)

      const client = new GitClient()
      const summary = await client.getDiffSummary('abc123')

      expect(summary.files).toHaveLength(1)
      expect(summary.files[0].file).toBe('test.js')
      expect(summary.changed).toBe(1)
    })
  })
})
