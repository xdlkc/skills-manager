# Skills Manager

Manage AI CLI skills (Claude Code, OpenCode) for team collaboration.

## Features

- Install skills from GitHub repositories or local paths
- List installed skills
- Uninstall skills
- Git version tracking
- Project-level configuration for team sharing
- Multi-CLI support (Claude Code, OpenCode)

## Installation

```bash
npm install -g skills-manager
```

Or use without installing:

```bash
npx skills-manager <command>
```

## Usage

### List Installed Skills

```bash
skills-manager list
```

Filter by CLI:

```bash
skills-manager list --cli claude-code
```

JSON output:

```bash
skills-manager list --format json
```

### Install a Skill

From GitHub:

```bash
skills-manager install https://github.com/user/skill.git
```

From local path:

```bash
skills-manager install ./local-skill
```

With options:

```bash
skills-manager install https://github.com/user/skill.git \
  --name my-skill \
  --cli claude-code \
  --branch develop \
  --path skills/review
```

### Uninstall a Skill

```bash
skills-manager uninstall my-skill
```

Force uninstall (skip confirmation):

```bash
skills-manager uninstall my-skill --force
```

## Configuration

### Global Config

`~/.skills-manager/config.json`:

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

### Project Config

`.skills.json` (project root):

```json
{
  "skills": [
    {
      "name": "my-team-review",
      "source": "https://github.com/my-team/skills.git",
      "path": "review/SKILL.md",
      "cli": "claude-code"
    }
  ]
}
```

## Environment Variables

- `GITHUB_TOKEN` - GitHub token for private repositories
- `CLAUDE_CODE_SKILLS_PATH` - Override Claude Code skills directory
- `OPENCODE_SKILLS_PATH` - Override OpenCode skills directory

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run CLI
npm run dev
```

## License

ISC
