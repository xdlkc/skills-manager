import { describe, it, expect } from 'vitest'
import { SkillsManagerError, ErrorType, formatError } from './errors'

describe('SkillsManagerError', () => {
  it('should create error with type', () => {
    const error = new SkillsManagerError('Test error', ErrorType.Network)
    expect(error.type).toBe(ErrorType.Network)
    expect(error.message).toBe('Test error')
  })

  it('should include suggestion', () => {
    const error = new SkillsManagerError(
      'Test error',
      ErrorType.Network,
      'Check your connection'
    )
    expect(error.suggestion).toBe('Check your connection')
  })

  it('should include details', () => {
    const error = new SkillsManagerError('Test error', ErrorType.Config, undefined, {
      path: '/test',
    })
    expect(error.details).toEqual({ path: '/test' })
  })
})

describe('formatError', () => {
  it('should format SkillsManagerError without verbose', () => {
    const error = new SkillsManagerError(
      'Test error',
      ErrorType.Network,
      'Check connection'
    )
    const output = formatError(error, false)
    expect(output).toContain('Error: Test error')
    expect(output).toContain('Suggestion: Check connection')
    expect(output).not.toContain('Type:')
  })

  it('should format SkillsManagerError with verbose', () => {
    const error = new SkillsManagerError(
      'Test error',
      ErrorType.Network,
      'Check connection',
      { url: 'https://example.com' }
    )
    const output = formatError(error, true)
    expect(output).toContain('Error: Test error')
    expect(output).toContain('Suggestion: Check connection')
    expect(output).toContain('Type: NETWORK')
    expect(output).toContain('Details:')
  })

  it('should format generic Error', () => {
    const error = new Error('Generic error')
    const output = formatError(error, false)
    expect(output).toContain('Error: Generic error')
  })

  it('should format unknown error', () => {
    const output = formatError('Unknown', false)
    expect(output).toContain('Unknown error: Unknown')
  })
})
