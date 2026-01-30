#!/usr/bin/env node

import { Command } from 'commander'
import { installSkill } from './core/installer'
import { uninstallSkill } from './core/installer'
import { listSkills } from './commands/list'
import { InstallOptions, UninstallOptions, ListOptions, CliType } from './types'
import { formatError } from './utils/errors'
import chalk from 'chalk'

const program = new Command()

program
  .name('skills-manager')
  .description('Manage AI CLI skills for team collaboration')
  .version('0.1.0')

// Install command
program
  .command('install <source>')
  .description('Install a skill from a Git repository or local path')
  .option('--name <name>', 'Skill name (default: extracted from source)')
  .option('--path <path>', 'Subpath in repository')
  .option('--cli <cli>', 'Target CLI (claude-code or opencode)', 'claude-code')
  .option('--branch <branch>', 'Git branch (default: main)', 'main')
  .option('--verbose', 'Verbose output')
  .action(async (source: string, options: InstallOptions) => {
    try {
      await installSkill(source, options)
    } catch (error) {
      console.error(chalk.red(formatError(error, options.verbose)))
      process.exit(1)
    }
  })

// Uninstall command
program
  .command('uninstall <skill-name>')
  .description('Uninstall a skill')
  .option('--cli <cli>', 'Target CLI (claude-code or opencode)', 'claude-code')
  .option('--force', 'Skip confirmation')
  .option('--verbose', 'Verbose output')
  .action(async (skillName: string, options: UninstallOptions) => {
    try {
      await uninstallSkill(skillName, options.cli as CliType, options.force)
    } catch (error) {
      console.error(chalk.red(formatError(error, options.verbose)))
      process.exit(1)
    }
  })

// List command
program
  .command('list')
  .description('List installed skills')
  .option('--cli <cli>', 'Filter by CLI')
  .option('--format <format>', 'Output format (table or json)', 'table')
  .option('--verbose', 'Verbose output')
  .action(async (options: ListOptions) => {
    try {
      const skills = await listSkills(options)

      if (options.format === 'json') {
        console.log(JSON.stringify(skills, null, 2))
      } else {
        if (skills.length === 0) {
          console.log('No skills installed.')
          return
        }

        console.log('\nInstalled Skills:')
        console.log('─────────────────────────────────────────────────')
        for (const skill of skills) {
          console.log(`  ${chalk.green(skill.name)}`)
          console.log(`    CLI: ${skill.cli}`)
          console.log(`    Source: ${skill.source}`)
          if (skill.commit) {
            console.log(`    Commit: ${skill.commit.substring(0, 7)}`)
          }
          if (skill.branch) {
            console.log(`    Branch: ${skill.branch}`)
          }
          console.log('─────────────────────────────────────────────────')
        }
        console.log(`\nTotal: ${skills.length} skill(s)`)
      }
    } catch (error) {
      console.error(chalk.red(formatError(error, options.verbose)))
      process.exit(1)
    }
  })

// Parse arguments
program.parse(process.argv)
