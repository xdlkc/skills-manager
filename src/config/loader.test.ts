import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

// Mock paths module before importing loader
const mockGlobalConfigPath = join(tmpdir(), 'test-config.json')
const mockProjectConfigPath = join(tmpdir(), 'test-project.json')

vi.mock('../utils/paths', () => ({
  getGlobalConfigPath: () => mockGlobalConfigPath,
  getProjectConfigPath: () => mockProjectConfigPath,
  expandHomeDir: (p: string) => p.replace('~', '/home/test'),
}))

import {
  loadGlobalConfig,
  loadProjectConfig,
  resolveCliPath,
  validateSkillConfig,
} from './loader'
import { SkillsManagerError } from '../utils/errors'

describe('loadGlobalConfig', () => {
  afterEach(async () => {
    if (existsSync(mockGlobalConfigPath)) {
      await unlink(mockGlobalConfigPath)
    }
  })

  it('should return default config when file does not exist', async () => {
    const config = await loadGlobalConfig()
    expect(config.cli).toBeDefined()
    expect(config.cli['claude-code']).toBe('~/.claude/skills')
  })

  it('should load and parse config file', async () => {
    const testConfig = {
      cli: {
        'claude-code': '/custom/path',
        opencode: '/custom/opencode',
      },
    }

    await writeFile(mockGlobalConfigPath, JSON.stringify(testConfig))
    const config = await loadGlobalConfig()

    expect(config.cli['claude-code']).toBe('/custom/path')
  })

  it('should merge with defaults', async () => {
    const testConfig = {
      cli: {
        'claude-code': '/custom/path',
      },
    }

    await writeFile(mockGlobalConfigPath, JSON.stringify(testConfig))
    const config = await loadGlobalConfig()

    expect(config.cli['claude-code']).toBe('/custom/path')
    expect(config.cli.opencode).toBe('~/.opencode/skills')
  })

  it('should throw on invalid JSON', async () => {
    await writeFile(mockGlobalConfigPath, 'invalid json')
    await expect(loadGlobalConfig()).rejects.toThrow()
  })
})

describe('loadProjectConfig', () => {
  afterEach(async () => {
    if (existsSync(mockProjectConfigPath)) {
      await unlink(mockProjectConfigPath)
    }
  })

  it('should return null when file does not exist', async () => {
    const config = await loadProjectConfig()
    expect(config).toBeNull()
  })

  it('should load project config', async () => {
    const testConfig = {
      skills: [
        {
          name: 'test-skill',
          source: 'https://github.com/test/skill.git',
          cli: 'claude-code',
        },
      ],
    }

    await writeFile(mockProjectConfigPath, JSON.stringify(testConfig))
    const config = await loadProjectConfig()

    expect(config).not.toBeNull()
    expect(config?.skills).toHaveLength(1)
    expect(config?.skills[0].name).toBe('test-skill')
  })

  it('should throw error on invalid config', async () => {
    await writeFile(mockProjectConfigPath, JSON.stringify({}))
    await expect(loadProjectConfig()).rejects.toThrow(SkillsManagerError)
  })

  it('should throw on invalid JSON', async () => {
    await writeFile(mockProjectConfigPath, 'invalid')
    await expect(loadProjectConfig()).rejects.toThrow()
  })
})

describe('validateSkillConfig', () => {
  it('should validate correct config', () => {
    const config = {
      name: 'test-skill',
      source: 'https://github.com/test/skill.git',
      cli: 'claude-code' as const,
    }

    expect(() => validateSkillConfig(config)).not.toThrow()
  })

  it('should throw when name is missing', () => {
    const config = {
      source: 'https://github.com/test/skill.git',
      cli: 'claude-code' as const,
    }

    expect(() => validateSkillConfig(config)).toThrow(SkillsManagerError)
  })

  it('should throw when source is missing', () => {
    const config = {
      name: 'test-skill',
      cli: 'claude-code' as const,
    }

    expect(() => validateSkillConfig(config)).toThrow(SkillsManagerError)
  })

  it('should throw when CLI is missing', () => {
    const config = {
      name: 'test-skill',
      source: 'https://github.com/test/skill.git',
    } as any

    expect(() => validateSkillConfig(config)).toThrow(SkillsManagerError)
  })

  it('should throw when CLI is invalid', () => {
    const config = {
      name: 'test-skill',
      source: 'https://github.com/test/skill.git',
      cli: 'invalid-cli' as any,
    }

    expect(() => validateSkillConfig(config)).toThrow(SkillsManagerError)
  })
})

describe('resolveCliPath', () => {
  beforeEach(() => {
    // 清除环境变量
    delete process.env['CLAUDE_CODE_SKILLS_PATH']
    delete process.env['OPENCODE_SKILLS_PATH']
  })

  it('should use default path', async () => {
    const path = await resolveCliPath('claude-code')
    expect(path).toContain('.claude/skills')
  })

  it('should use environment variable', async () => {
    process.env['CLAUDE_CODE_SKILLS_PATH'] = '/custom/path'
    const path = await resolveCliPath('claude-code')
    expect(path).toBe('/custom/path')
    delete process.env['CLAUDE_CODE_SKILLS_PATH']
  })
})
