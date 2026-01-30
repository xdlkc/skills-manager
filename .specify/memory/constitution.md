<!--
Sync Impact Report
================
Version change: None → 1.0.0
Modified principles: None (initial creation)
Added sections:
  - Project Overview
  - Core Principles (5 principles)
  - Architecture & Design
  - Development Workflow
  - Testing & Quality
  - Documentation
  - Governance
Templates requiring updates:
  - ✅ N/A (no templates exist yet, will be created)
Follow-up TODOs: None
-->

# Skills Manager Constitution

**Version**: 1.0.0
**Ratification Date**: 2026-01-25
**Last Amended Date**: 2026-01-25

## Project Overview

Skills Manager is a command-line interface (CLI) tool for managing agent skills, designed to provide a user experience comparable to npm for package management. The tool enables installation, listing, updating, and comparing (diff) of agent skills across multiple CLI environments.

### Core Commands

- `install`: Install skills from remote repositories or local sources
- `list`: Display all installed skills with version information
- `update`: Update installed skills to their latest compatible versions
- `diff`: Compare versions or configurations of skills

## Core Principles

### Principle 1: npm-Like CLI Experience

The Skills Manager MUST follow npm's command-line interface conventions and patterns to minimize user cognitive load.

**Requirements**:
- Command structure MUST mirror npm (e.g., `skills install <package>`, `skills list`)
- Output format MUST be human-readable with optional JSON output flags
- Error messages MUST follow npm's style and provide actionable guidance
- Configuration files MUST support npm-compatible conventions where applicable

**Rationale**: npm is the de-facto standard for package management in the JavaScript ecosystem. Adopting its patterns ensures familiarity and reduces learning curve for developers already using npm.

### Principle 2: Multi-CLI Compatibility

The Skills Manager MUST support skills across multiple CLI environments (e.g., Claude Code, OpenAI CLI, GitHub CLI).

**Requirements**:
- Skills MUST include metadata declaring compatible CLI target(s)
- Installation MUST validate CLI compatibility before proceeding
- Version resolution MUST account for CLI-specific dependencies
- Namespace isolation MUST prevent conflicts between CLI environments

**Rationale**: Users work with multiple AI/CLI tools. A unified skills manager must handle the complexity of cross-CLI compatibility while preventing namespace collisions.

### Principle 3: Semantic Versioning Enforcement

Skills MUST follow Semantic Versioning (SemVer) 2.0.0, and Skills Manager MUST enforce version constraints.

**Requirements**:
- All skills MUST declare valid semantic versions (MAJOR.MINOR.PATCH)
- Version ranges MUST be validated against SemVer specification
- Update operations MUST respect SemVer compatibility rules
- Pre-release and build metadata MUST be properly handled

**Rationale**: Semantic versioning provides a standard contract for compatibility expectations. Strict enforcement prevents breaking changes from being automatically applied.

### Principle 4: Skill Diff Capability

The Skills Manager MUST provide detailed comparison capabilities between skill versions and configurations.

**Requirements**:
- `diff` command MUST show structural and functional differences
- Output MUST be machine-readable (JSON) and human-readable (unified diff)
- Diff MUST include code changes, metadata changes, and dependency changes
- Diff MUST support comparing local vs remote versions

**Rationale**: Understanding what changes between versions is critical for assessing upgrade risk and debugging issues. Detailed diffs enable informed decision-making.

### Principle 5: Idempotent Operations

All Skills Manager commands MUST be idempotent—running the same command multiple times with the same inputs yields identical results.

**Requirements**:
- `install` of an already-installed skill MUST be a no-op or explicitly requested upgrade
- `update` without changes available MUST report "up to date" status
- Commands MUST handle partial failures gracefully and maintain consistency
- State changes MUST be atomic or provide rollback capabilities

**Rationale**: Idempotency ensures reliability in automated workflows and CI/CD pipelines where commands may be re-executed due to retries or reruns.

## Architecture & Design

### Core Components

1. **CLI Interface**: Command parsing and user interaction layer
2. **Package Registry**: Remote skill repository with metadata storage
3. **Local Store**: Filesystem-based skill installation directory
4. **Dependency Resolver**: Version constraint satisfaction engine
5. **Diff Engine**: Comparison and difference visualization component
6. **Configuration Manager**: User and project-level settings handler

### Technology Constraints

- The core implementation MUST use a language with strong CLI library support (e.g., Node.js, Rust, Go)
- Configuration files MUST be in YAML or JSON format
- Skill manifests MUST follow a standardized schema
- Package registry MUST support standard HTTP/HTTPS with optional authentication

### Data Flow

1. User invokes command through CLI
2. Command parser validates arguments and configuration
3. Appropriate handler processes request (install/list/update/diff)
4. Dependency resolver interacts with registry and local store
5. Results formatted and displayed to user

## Development Workflow

### Code Organization

- Source code MUST be organized by component (CLI, registry, store, resolver, diff)
- Each component MUST have clear interfaces and minimal coupling
- Shared utilities MUST be placed in a common utilities module
- Tests MUST coexist with source files in a `__tests__` or `tests` directory

### Code Quality

- All code MUST pass linting checks before merge
- Code coverage MUST not fall below 80% for critical paths
- Complex logic MUST include inline comments explaining rationale
- Public APIs MUST have documentation comments

### Version Control

- Feature branches MUST be named `feature/<description>`
- Bugfix branches MUST be named `fix/<description>`
- Pull requests MUST include descriptive titles and link to issues
- Main branch MUST be kept in deployable state

## Testing & Quality

### Test Pyramid

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test component interactions and dependencies
- **End-to-End Tests**: Test complete user workflows

### Test Coverage

- All commands MUST have E2E test coverage for happy paths
- Error scenarios MUST have integration test coverage
- Core algorithms (version resolution, diff) MUST have 100% coverage
- Edge cases MUST be explicitly tested

### Quality Gates

- All tests MUST pass before merging to main
- Linting checks MUST pass with zero warnings
- Security scans MUST be run on all dependencies
- Performance benchmarks MUST not regress

## Documentation

### Required Documentation

- **README.md**: Project overview, installation, quick start guide
- **COMMANDS.md**: Detailed documentation for each command
- **API.md**: Public API documentation for extending the tool
- **CONTRIBUTING.md**: Guidelines for contributors
- **CHANGELOG.md**: Version history and changes per release

### Documentation Standards

- All public commands MUST have `--help` output
- Examples MUST be provided for each command usage
- Configuration options MUST be documented with defaults
- Error messages MUST be documented with resolution steps

## Governance

### Amendment Procedure

1. Proposed changes MUST be submitted as issues with "constitution" label
2. Changes MUST be reviewed by maintainers and discussed with community
3. Consensus MUST be reached before proposing amendments
4. Amendments MUST increment the version according to SemVer rules
5. Amendments MUST be documented in CHANGELOG.md

### Versioning Policy

Constitution versions follow semantic versioning:
- **MAJOR**: Backward-incompatible governance changes, principle removals, or redefinitions
- **MINOR**: New principles added, existing principles materially expanded
- **PATCH**: Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance Review

- Code changes MUST be reviewed against relevant principles
- Pull request templates MUST include constitution compliance checklist
- Violations of core principles MUST block merge until addressed
- Non-compliance MUST be documented with rationale for exceptions
