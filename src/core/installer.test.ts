import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { installSkill, uninstallSkill } from './installer'
import { SkillsManagerError } from '../utils/errors'

// Mock dependencies
vi.mock('./git', () => ({
  GitClient: vi.fn().mockImplementation(() => ({
    cloneRepo: vi.fn(),
    getCommitInfo: vi.fn().mockResolvedValue({
      hash: 'abc123',
      message: 'test',
      date: '2024-01-01',
      branch: 'main',
    }),
  })),
}))

vi.mock('../config/loader', () => ({
  resolveCliPath: vi.fn().mockResolvedValue('/test/cli/skills'),
}))

import { resolveCliPath } from '../config/loader'

describe('installSkill', () => {
  const testSkillDir = join(tmpdir(), 'test-skill')
  const testSkillFile = join(testSkillDir, 'SKILL.md')

  beforeEach(async () => {
    vi.clearAllMocks()
    // 创建测试技能目录
    await mkdir(testSkillDir, { recursive: true })
    await writeFile(testSkillFile, '# Test Skill')
  })

  afterEach(async () => {
    try {
      await rm(testSkillDir, { recursive: true, force: true })
    } catch {}
  })

  it('should install from local path', async () => {
    vi.mocked(resolveCliPath).mockResolvedValue(join(tmpdir(), 'skills'))

    await installSkill(testSkillDir, {})

    const installedDir = join(tmpdir(), 'skills', 'test-skill')
    const installedFile = join(installedDir, 'SKILL.md')
    const sourceFile = join(installedDir, '.source.json')

    // 验证 SKILL.md 存在
    const content = await readFile(installedFile, 'utf-8')
    expect(content).toBe('# Test Skill')

    // 验证 .source.json 存在
    const sourceInfo = JSON.parse(await readFile(sourceFile, 'utf-8'))
    expect(sourceInfo.source).toBe(testSkillDir)
    expect(sourceInfo.installedAt).toBeDefined()

    // 清理
    await rm(join(tmpdir(), 'skills'), { recursive: true, force: true })
  })

  it('should extract name from source', async () => {
    vi.mocked(resolveCliPath).mockResolvedValue(join(tmpdir(), 'skills'))

    await installSkill(testSkillDir, {})

    const installedDir = join(tmpdir(), 'skills', 'test-skill')
    const exists = await (async () => {
      try {
        await readFile(join(installedDir, 'SKILL.md'))
        return true
      } catch {
        return false
      }
    })()
    expect(exists).toBe(true)

    await rm(join(tmpdir(), 'skills'), { recursive: true, force: true })
  })

  it('should throw on already installed', async () => {
    vi.mocked(resolveCliPath).mockResolvedValue(join(tmpdir(), 'skills'))

    // 第一次安装
    await installSkill(testSkillDir, {})

    // 第二次安装应该失败
    await expect(installSkill(testSkillDir, {})).rejects.toThrow(SkillsManagerError)

    await rm(join(tmpdir(), 'skills'), { recursive: true, force: true })
  })
})

describe('uninstallSkill', () => {
  const testSkillDir = join(tmpdir(), 'test-skill')
  const testSkillFile = join(testSkillDir, 'SKILL.md')

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(resolveCliPath).mockResolvedValue(join(tmpdir(), 'skills'))
    await mkdir(testSkillDir, { recursive: true })
    await writeFile(testSkillFile, '# Test Skill')
  })

  afterEach(async () => {
    try {
      await rm(join(tmpdir(), 'skills'), { recursive: true, force: true })
      await rm(testSkillDir, { recursive: true, force: true })
    } catch {}
  })

  it('should uninstall skill', async () => {
    // 先安装
    await installSkill(testSkillDir, {})

    // 然后卸载
    await uninstallSkill('test-skill')

    const installedDir = join(tmpdir(), 'skills', 'test-skill')
    const exists = await (async () => {
      try {
        await readFile(join(installedDir, 'SKILL.md'))
        return true
      } catch {
        return false
      }
    })()
    expect(exists).toBe(false)
  })

  it('should throw on skill not found', async () => {
    await expect(uninstallSkill('nonexistent')).rejects.toThrow(SkillsManagerError)
  })
})
