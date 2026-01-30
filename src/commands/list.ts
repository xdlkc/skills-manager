import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { resolveCliPath, CliType } from '../config/loader'
import { ListOptions } from '../types'
import { SourceInfo } from '../types'

/**
 * 列出已安装的技能
 */
export async function listSkills(options: ListOptions = {}): Promise<SkillInfo[]> {
  const { cli, format = 'table' } = options

  const cliType: CliType | undefined = cli
  const skills: SkillInfo[] = []

  // 列出指定 CLI 或所有 CLI 的技能
  const cliTypes: CliType[] = cliType ? [cliType] : ['claude-code', 'opencode']

  for (const cliType of cliTypes) {
    const skillsPath = await resolveCliPath(cliType)

    if (existsSync(skillsPath)) {
      const entries = await readdir(skillsPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillDir = join(skillsPath, entry.name)
          const skillInfo = await getSkillInfo(skillDir, cliType)
          if (skillInfo) {
            skills.push(skillInfo)
          }
        }
      }
    }
  }

  return skills
}

/**
 * 获取技能信息
 */
async function getSkillInfo(
  skillDir: string,
  cli: CliType
): Promise<SkillInfo | null> {
  const sourceFile = join(skillDir, '.source.json')

  if (!existsSync(sourceFile)) {
    return {
      name: getSkillName(skillDir),
      cli,
      source: 'unknown',
      installedAt: 'unknown',
    }
  }

  try {
    const sourceInfo = JSON.parse(await readFile(sourceFile, 'utf-8')) as SourceInfo

    return {
      name: getSkillName(skillDir),
      cli,
      source: sourceInfo.source,
      commit: sourceInfo.commit,
      branch: sourceInfo.branch,
      installedAt: sourceInfo.installedAt,
    }
  } catch {
    return null
  }
}

function getSkillName(skillDir: string): string {
  return skillDir.split('/').pop() || 'unknown'
}

export interface SkillInfo {
  name: string
  cli: CliType
  source: string
  commit?: string
  branch?: string
  installedAt: string
}
