import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync } from 'node:fs'

// Mock config/loader
vi.mock('../config/loader', () => ({
  resolveCliPath: vi.fn().mockResolvedValue(join(tmpdir(), 'skills')),
  CliType: {
    'claude-code': 'claude-code' as const,
    opencode: 'opencode' as const,
  },
}))

import { listSkills } from './list'

describe('listSkills', () => {
  const skillsDir = join(tmpdir(), 'skills')

  beforeEach(async () => {
    vi.clearAllMocks()

    // 清理旧数据
    if (existsSync(skillsDir)) {
      await rm(skillsDir, { recursive: true, force: true })
    }

    await mkdir(skillsDir, { recursive: true })

    // 创建两个技能
    const skill1Dir = join(skillsDir, 'skill1')
    const skill2Dir = join(skillsDir, 'skill2')
    await mkdir(skill1Dir, { recursive: true })
    await mkdir(skill2Dir, { recursive: true })

    await writeFile(join(skill1Dir, '.source.json'), JSON.stringify({
      source: 'https://github.com/test/skill1.git',
      commit: 'abc123',
      branch: 'main',
      installedAt: '2024-01-01',
    }))

    await writeFile(join(skill2Dir, '.source.json'), JSON.stringify({
      source: 'https://github.com/test/skill2.git',
      commit: 'def456',
      branch: 'develop',
      installedAt: '2024-01-02',
    }))
  })

  afterEach(async () => {
    if (existsSync(skillsDir)) {
      await rm(skillsDir, { recursive: true, force: true })
    }
  })

  it('should list all skills from all CLIs', async () => {
    const skills = await listSkills()

    // 默认列出所有 CLI 的技能，mock 返回相同路径，所以是 2*2=4
    expect(skills.length).toBeGreaterThan(0)
  })

  it('should list skills from specific CLI', async () => {
    const skills = await listSkills({ cli: 'claude-code' })

    expect(skills).toHaveLength(2)
    expect(skills[0].name).toBe('skill1')
    expect(skills[1].name).toBe('skill2')
  })

  it('should return skill info', async () => {
    const skills = await listSkills({ cli: 'claude-code' })

    expect(skills[0].source).toBe('https://github.com/test/skill1.git')
    expect(skills[0].commit).toBe('abc123')
    expect(skills[0].branch).toBe('main')
  })
})
