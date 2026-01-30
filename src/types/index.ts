// CLI 类型
export type CliType = 'claude-code' | 'opencode'

// 配置文件
export interface GlobalConfig {
  cli: Record<CliType, string>
  auth?: {
    githubToken?: string
  }
}

export interface SkillConfig {
  name: string
  source: string
  path?: string
  cli: CliType
}

export interface ProjectConfig {
  skills: SkillConfig[]
}

// 技能源信息
export interface SourceInfo {
  source: string
  commit: string
  branch: string
  path?: string
  installedAt: string
}

// Git 信息
export interface CommitInfo {
  hash: string
  message: string
  date: string
  branch: string
}

// CLI 选项
export interface CommonOptions {
  verbose?: boolean
}

export interface InstallOptions extends CommonOptions {
  name?: string
  path?: string
  cli?: CliType
  branch?: string
}

export interface UpdateOptions extends CommonOptions {
  branch?: string
  commit?: string
}

export interface UninstallOptions extends CommonOptions {
  cli?: CliType
  force?: boolean
}

export interface ListOptions extends CommonOptions {
  cli?: CliType
  format?: 'table' | 'json'
}

export interface DiffOptions extends CommonOptions {
  format?: 'diff' | 'summary'
}

export interface SyncOptions extends CommonOptions {
  dryRun?: boolean
}
