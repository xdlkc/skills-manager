import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * 扩展 ~ 为用户主目录
 */
export function expandHomeDir(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2))
  }
  if (path === '~') {
    return homedir()
  }
  return path
}

/**
 * 获取全局配置文件路径
 */
export function getGlobalConfigPath(): string {
  return join(homedir(), '.skills-manager', 'config.json')
}

/**
 * 获取项目配置文件路径
 */
export function getProjectConfigPath(cwd: string = process.cwd()): string {
  return join(cwd, '.skills.json')
}
