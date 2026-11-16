# Skills Manager

English | [简体中文](./README.zh-CN.md)

A TypeScript CLI (`v0.1.0`) for installing, listing, and uninstalling AI CLI skills across **Claude Code** and **OpenCode**, with `.source.json` Git provenance tracking and shared configuration schemas.

## Features

- **Multi-agent support**: Manages skill directories for `claude-code` (`~/.claude/skills`) and `opencode` (`~/.opencode/skills`).
- **Git & local sources**: Installs skills from remote Git repositories (with `--branch` and `--path` subpath selection) or local directories (`./`, `/`, `~/`).
- **Skill validation & provenance**: Requires `SKILL.md` in the installed directory and writes `.source.json` (`source`, `commit`, `branch`, `path`, `installedAt`) for tracking installed versions.
- **Structured inventory**: Lists installed skills across targets in table or JSON (`--format json`) format.
- **Configurable paths & project schema**: Supports environment overrides, global config (`~/.skills-manager/config.json`), and validated project-level `.skills.json` schema (`loadProjectConfig` / `validateSkillConfig`).

## Installation

Requirements: **Node.js 18+** and `git`.

### From Source (Recommended for Current v0.1.0)

```bash
git clone https://github.com/xdlkc/skills-manager.git
cd skills-manager
npm install
npm run build
npm link          # Exposes `skills-manager` globally
```

Or run directly without linking:

```bash
node dist/index.js --help
# or during development:
npm run dev -- --help
```

If published to an npm registry:

```bash
npm install -g skills-manager
# or: npx skills-manager <command>
```

## CLI Usage

### `install <source>`

Install a skill from a Git URL or local path (`./`, `/`, `~/`):

```bash
# From GitHub (defaults to --cli claude-code --branch main)
skills-manager install https://github.com/user/skill.git

# From a local directory
skills-manager install ./local-skill

# Specify skill name, target CLI, branch, and repository subdirectory
skills-manager install https://github.com/user/skills-monorepo.git \
  --name my-skill \
  --cli opencode \
  --branch develop \
  --path skills/review \
  --verbose
```

Options:

| Option | Description | Default |
|---|---|---|
| `--name <name>` | Target skill directory name | Repo name (GitHub URL) or directory basename |
| `--path <path>` | Subdirectory inside the repo/local source containing `SKILL.md` | Repository/source root |
| `--cli <cli>` | Target CLI (`claude-code` or `opencode`) | `claude-code` |
| `--branch <branch>` | Git branch to clone | `main` |
| `--verbose` | Show detailed error output and context | `false` |

### `list`

List installed skills across CLIs:

```bash
skills-manager list
skills-manager list --cli claude-code
skills-manager list --format json
```

Options:

| Option | Description | Default |
|---|---|---|
| `--cli <cli>` | Filter by `claude-code` or `opencode` | Both CLIs |
| `--format <format>` | Output format (`table` or `json`) | `table` |
| `--verbose` | Show detailed error output | `false` |

### `uninstall <skill-name>`

Remove an installed skill directory:

```bash
skills-manager uninstall my-skill
skills-manager uninstall my-skill --cli opencode --force
```

Options:

| Option | Description | Default |
|---|---|---|
| `--cli <cli>` | Target CLI (`claude-code` or `opencode`) | `claude-code` |
| `--force` | Skip confirmation | `false` |
| `--verbose` | Show detailed error output | `false` |

> **Implementation status**: Core helpers in [`src/core/git.ts`](./src/core/git.ts), config schema loaders in [`src/config/loader.ts`](./src/config/loader.ts), and option types in [`src/types/index.ts`](./src/types/index.ts) define building blocks for `update`, `diff`, and `sync` (per [`docs/plans/2026-01-30-skills-manager-design.md`](./docs/plans/2026-01-30-skills-manager-design.md)), but [`src/index.ts`](./src/index.ts) currently exposes `install`, `uninstall`, and `list`.

## Configuration

### CLI Path Resolution Order

`resolveCliPath()` in [`src/config/loader.ts`](./src/config/loader.ts) resolves target skill directories in this order:

1. Environment variable (`CLAUDE_CODE_SKILLS_PATH` or `OPENCODE_SKILLS_PATH`, loaded with `dotenv`)
2. Global config (`~/.skills-manager/config.json` -> `cli.<cli>`)
3. Built-in defaults (`~/.claude/skills` and `~/.opencode/skills`)

### Global Config (`~/.skills-manager/config.json`)

```json
{
  "cli": {
    "claude-code": "~/.claude/skills",
    "opencode": "~/.opencode/skills"
  },
  "auth": {
    "githubToken": "$GITHUB_TOKEN"
  }
}
```

### Project Config Schema (`.skills.json`)

Validated by `loadProjectConfig()` and `validateSkillConfig()` in [`src/config/loader.ts`](./src/config/loader.ts):

```json
{
  "skills": [
    {
      "name": "my-team-review",
      "source": "https://github.com/my-team/skills.git",
      "path": "skills/review",
      "cli": "claude-code"
    }
  ]
}
```

Each entry requires `name` (string), `source` (Git URL or local path), `cli` (`"claude-code"` or `"opencode"`), and optional `path` (subdirectory containing `SKILL.md`).

### Installed Provenance File (`.source.json`)

Written into each installed skill folder by `installSkill()`:

```json
{
  "source": "https://github.com/user/skill.git",
  "commit": "a1b2c3d4...",
  "branch": "main",
  "path": "skills/review",
  "installedAt": "2026-01-30T10:00:00.000Z"
}
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | Personal access token injected into HTTPS clones for private repositories |
| `CLAUDE_CODE_SKILLS_PATH` | Override Claude Code skills directory |
| `OPENCODE_SKILLS_PATH` | Override OpenCode skills directory |

## Development

```bash
npm install
npm test             # Run Vitest unit tests (watch mode by default; pass `run` for single pass)
npm run test:ui      # Launch Vitest UI
npm run test:coverage
npm run build        # Bundle ESM output & types to dist/ via tsup
npm run dev -- list  # Run TypeScript source directly via tsx
```

## Project Layout

```text
skills-manager/
├── README.md
├── README.zh-CN.md
├── package.json
├── bin/skills-manager              # CLI wrapper importing dist/index.js
├── dist/                           # Built ESM bundle & .d.ts declarations
├── docs/plans/                     # Design specification
└── src/
    ├── index.ts                    # Commander CLI entrypoint (install, uninstall, list)
    ├── commands/list.ts            # Installed skills scanner (.source.json reader)
    ├── config/loader.ts            # Global/project config & CLI path resolution
    ├── core/
    │   ├── git.ts                  # simple-git wrapper (clone, commit info, pull, diff)
    │   └── installer.ts            # Skill copy, SKILL.md validation, .source.json writer
    ├── types/index.ts              # Shared TypeScript interfaces
    └── utils/
        ├── errors.ts               # Structured SkillsManagerError & formatting
        └── paths.ts                # Home expansion and config path helpers
```

## License

ISC (see [`package.json`](./package.json))
