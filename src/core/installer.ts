import { mkdir, cp, access, readFile, writeFile, rm } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { existsSync } from 'node:fs'
import { GitClient } from './git'
import { SourceInfo, InstallOptions, CliType } from '../types'
import { SkillsManagerError, ErrorType } from '../utils/errors'
import { resolveCliPath } from '../config/loader'

/**
 * 安装技能
 */
export async function installSkill(
  source: string,
  options: InstallOptions = {}
): Promise<void> {
  const { name, path: subPath, cli = 'claude-code', branch } = options

  // 解析目标路径
  const targetCliPath = await resolveCliPath(cli)
  const skillName = name || extractNameFromSource(source)
  const targetDir = join(targetCliPath, skillName)

  // 检查是否已安装
  if (existsSync(targetDir)) {
    throw new SkillsManagerError(
      `Skill already installed: ${skillName}`,
      ErrorType.Skill,
      'Use update command to update existing skill'
    )
  }

  // 创建目标目录
  await mkdir(targetCliPath, { recursive: true })

  const isLocal = isLocalPath(source)
  let tempDir = ''

  try {
    if (isLocal) {
      // 本地路径安装
      await copyLocalSkill(source, targetDir, subPath)
    } else {
      // Git 仓库安装
      tempDir = `/tmp/skills-install-${Date.now()}`
      const git = new GitClient()

      await git.cloneRepo(source, tempDir, {
        token: process.env.GITHUB_TOKEN,
        branch,
      })

      // 复制技能文件
      if (subPath) {
        await copySubPath(tempDir, subPath, targetDir)
      } else {
        await cp(tempDir, targetDir, { recursive: true })
      }
    }

    // 验证 SKILL.md
    await validateSkill(targetDir)

    // 写入 .source.json
    const sourceInfo: SourceInfo = {
      source,
      commit: isLocal ? '' : await getGitCommit(tempDir),
      branch: branch || 'main',
      path: subPath,
      installedAt: new Date().toISOString(),
    }

    await writeFile(
      join(targetDir, '.source.json'),
      JSON.stringify(sourceInfo, null, 2)
    )

    console.log(`✓ Skill installed: ${skillName}`)
  } finally {
    // 清理临时目录
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true })
    }
  }
}

/**
 * 卸载技能
 */
export async function uninstallSkill(
  skillName: string,
  cli: CliType = 'claude-code',
  force = false
): Promise<void> {
  const targetCliPath = await resolveCliPath(cli)
  const targetDir = join(targetCliPath, skillName)

  if (!existsSync(targetDir)) {
    throw new SkillsManagerError(
      `Skill not found: ${skillName}`,
      ErrorType.Skill
    )
  }

  if (!force) {
    // 这里可以使用 inquirer 确认，暂时直接删除
    console.log(`Uninstalling skill: ${skillName}`)
  }

  await rm(targetDir, { recursive: true, force: true })
  console.log(`✓ Skill uninstalled: ${skillName}`)
}

/**
 * 从源提取名称
 */
function extractNameFromSource(source: string): string {
  if (isLocalPath(source)) {
    return basename(source)
  }

  // GitHub URL: https://github.com/user/repo.git -> repo
  const match = source.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
  if (match) {
    return match[2]
  }

  throw new SkillsManagerError(
    'Could not extract skill name from source',
    ErrorType.Config,
    'Use --name to specify the skill name'
  )
}

/**
 * 检查是否为本地路径
 */
function isLocalPath(source: string): boolean {
  return source.startsWith('./') || source.startsWith('/') || source.startsWith('~/')
}

/**
 * 复制本地技能
 */
async function copyLocalSkill(
  source: string,
  targetDir: string,
  subPath?: string
): Promise<void> {
  const sourcePath = subPath ? join(source, subPath) : source

  if (!existsSync(sourcePath)) {
    throw new SkillsManagerError(
      `Source path not found: ${sourcePath}`,
      ErrorType.FileSystem
    )
  }

  await cp(sourcePath, targetDir, { recursive: true })
}

/**
 * 复制子路径
 */
async function copySubPath(
  sourceDir: string,
  subPath: string,
  targetDir: string
): Promise<void> {
  const sourcePath = join(sourceDir, subPath)

  if (!existsSync(sourcePath)) {
    throw new SkillsManagerError(
      `Subpath not found in repository: ${subPath}`,
      ErrorType.Skill
    )
  }

  await cp(sourcePath, targetDir, { recursive: true })
}

/**
 * 验证技能
 */
async function validateSkill(skillDir: string): Promise<void> {
  const skillFilePath = join(skillDir, 'SKILL.md')

  try {
    await access(skillFilePath)
  } catch {
    throw new SkillsManagerError(
      'SKILL.md not found',
      ErrorType.Skill,
      'Ensure the skill directory contains a SKILL.md file'
    )
  }
}

/**
 * 获取 Git commit（简化版，实际应该使用 GitClient）
 */
async function getGitCommit(repoDir: string): Promise<string> {
  try {
    const git = new GitClient(repoDir)
    const info = await git.getCommitInfo()
    return info.hash
  } catch {
    return ''
  }
}
