// 错误类型定义
export enum ErrorType {
  Config = 'CONFIG',
  Network = 'NETWORK',
  FileSystem = 'FILE_SYSTEM',
  Skill = 'SKILL',
  Generic = 'GENERIC',
}

export class SkillsManagerError extends Error {
  type: ErrorType
  suggestion?: string
  details?: Record<string, unknown>

  constructor(
    message: string,
    type: ErrorType = ErrorType.Generic,
    suggestion?: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'SkillsManagerError'
    this.type = type
    this.suggestion = suggestion
    this.details = details
  }
}

export function formatError(error: unknown, verbose = false): string {
  if (error instanceof SkillsManagerError) {
    let output = `Error: ${error.message}\n`
    if (error.suggestion) {
      output += `Suggestion: ${error.suggestion}\n`
    }
    if (verbose) {
      output += `\nType: ${error.type}\n`
      if (error.details) {
        output += `Details: ${JSON.stringify(error.details, null, 2)}\n`
      }
      if (error.stack) {
        output += `\n${error.stack}\n`
      }
    }
    return output
  }

  if (error instanceof Error) {
    let output = `Error: ${error.message}\n`
    if (verbose && error.stack) {
      output += `\n${error.stack}\n`
    }
    return output
  }

  return `Unknown error: ${String(error)}\n`
}
