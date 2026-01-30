import { describe, it, expect, vi } from 'vitest'
import { expandHomeDir, getGlobalConfigPath, getProjectConfigPath } from './paths'

describe('expandHomeDir', () => {
  it('should expand ~ to home directory', () => {
    const result = expandHomeDir('~')
    expect(result).not.toBe('~')
    expect(result).toContain(process.env.HOME || '/')
  })

  it('should expand ~/path to home/path', () => {
    const result = expandHomeDir('~/skills')
    expect(result).not.toBe('~/skills')
    expect(result).not.toContain('~')
    expect(result).toContain('skills')
  })

  it('should not modify regular paths', () => {
    const result = expandHomeDir('/usr/local/bin')
    expect(result).toBe('/usr/local/bin')
  })

  it('should handle empty string', () => {
    const result = expandHomeDir('')
    expect(result).toBe('')
  })
})

describe('getGlobalConfigPath', () => {
  it('should return ~/.skills-manager/config.json', () => {
    const result = getGlobalConfigPath()
    expect(result).toContain('.skills-manager')
    expect(result).toContain('config.json')
  })
})

describe('getProjectConfigPath', () => {
  it('should return current directory .skills.json', () => {
    const result = getProjectConfigPath()
    expect(result).toContain('.skills.json')
    expect(result).not.toContain('~')
  })

  it('should use provided directory', () => {
    const result = getProjectConfigPath('/test/path')
    expect(result).toBe('/test/path/.skills.json')
  })
})
