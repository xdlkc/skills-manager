import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import dotenv from 'dotenv'
import {
  GlobalConfig,
  ProjectConfig,
  CliType,
  type SkillConfig,
} from '../types'
import { SkillsManagerError, ErrorType } from '../utils/errors'
import { expandHomeDir, getGlobalConfigPath, getProjectConfigPath } from '../utils/paths'

// 默认 CLI 路径
const DEFAULT_CLI_PATHS: Record<CliType, string> = {
  'claude-code': '~/.claude/skills',
  opencode: '~/.opencode/skills',
}

// 默认全局配置
const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  cli: DEFAULT_CLI_PATHS,
}

/**
 * 加载全局配置
 */
export async function loadGlobalConfig(): Promise<GlobalConfig> {
  const configPath = getGlobalConfigPath()

  try {
    if (!(await fileExists(configPath))) {
      return DEFAULT_GLOBAL_CONFIG
    }

    const content = await readFile(configPath, 'utf-8')
    const config = JSON.parse(content) as Partial<GlobalConfig>

    return {
      cli: {
        ...DEFAULT_CLI_PATHS,
        ...config.cli,
      },
      auth: config.auth,
    }
  } catch (error) {
    throw new SkillsManagerError(
      'Failed to load global config',
      ErrorType.Config,
      'Check ~/.skills-manager/config.json format',
      { path: configPath }
    )
  }
}

/**
 * 加载项目配置
 */
export async function loadProjectConfig(cwd: string = process.cwd()): Promise<ProjectConfig | null> {
  const configPath = getProjectConfigPath(cwd)

  try {
    if (!(await fileExists(configPath))) {
      return null
    }

    const content = await readFile(configPath, 'utf-8')
    const config = JSON.parse(content) as ProjectConfig

    // 验证配置结构
    if (!config.skills || !Array.isArray(config.skills)) {
      throw new SkillsManagerError(
        'Invalid project config: missing or invalid skills array',
        ErrorType.Config,
        'Ensure .skills.json has a "skills" array'
      )
    }

    return config
  } catch (error) {
    if (error instanceof SkillsManagerError) throw error
    throw new SkillsManagerError(
      'Failed to load project config',
      ErrorType.Config,
      'Check .skills.json format',
      { path: configPath }
    )
  }
}

/**
 * 解析 CLI 路径
 * 优先级：项目配置 > 全局配置 > 环境变量 > 默认值
 */
export async function resolveCliPath(cliType: CliType, cwd?: string): Promise<string> {
  // 1. 加载环境变量
  dotenv.config()
  const envVar = `${cliType.toUpperCase().replace('-', '_')}_SKILLS_PATH`
  if (process.env[envVar]) {
    return expandHomeDir(process.env[envVar]!)
  }

  // 2. 加载全局配置
  const globalConfig = await loadGlobalConfig()
  if (globalConfig.cli[cliType]) {
    return expandHomeDir(globalConfig.cli[cliType])
  }

  // 3. 使用默认值
  return expandHomeDir(DEFAULT_CLI_PATHS[cliType])
}

/**
 * 验证技能配置
 */
export function validateSkillConfig(config: SkillConfig): void {
  if (!config.name) {
    throw new SkillsManagerError(
      'Skill name is required',
      ErrorType.Config
    )
  }

  if (!config.source) {
    throw new SkillsManagerError(
      'Skill source is required',
      ErrorType.Config
    )
  }

  if (!config.cli) {
    throw new SkillsManagerError(
      'CLI type is required',
      ErrorType.Config
    )
  }

  if (config.cli !== 'claude-code' && config.cli !== 'opencode') {
    throw new SkillsManagerError(
      `Invalid CLI type: ${config.cli}`,
      ErrorType.Config,
      'Use "claude-code" or "opencode"'
    )
  }
}

// 辅助函数：检查文件是否存在
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
