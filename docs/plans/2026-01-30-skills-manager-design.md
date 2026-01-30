# Skills Manager 设计文档

## 项目概述

Skills Manager 是一个 npm 包，用于在团队环境中管理 Claude Code 和 OpenCode 的技能（skills）。它支持从 GitHub 仓库或本地路径安装、更新、卸载和列出技能，帮助团队成员共享和管理统一的技能集合。

## 核心命令

- `skills-manager install <source> [options]` - 安装技能
- `skills-manager update <skill-name> [options]` - 更新技能
- `skills-manager uninstall <skill-name>` - 卸载技能
- `skills-manager list` - 列出已安装的技能
- `skills-manager diff <skill-name>` - 查看技能变更
- `skills-manager sync` - 根据项目配置同步技能

## 项目结构

```
skills-manager/
├── package.json              # npm 包配置
├── bin/
│   └── skills-manager       # CLI 入口文件
├── src/
│   ├── commands/            # 命令实现
│   │   ├── install.ts
│   │   ├── update.ts
│   │   ├── uninstall.ts
│   │   ├── list.ts
│   │   ├── diff.ts
│   │   └── sync.ts
│   ├── config/              # 配置管理
│   │   ├── loader.ts        # 配置文件加载
│   │   └── resolver.ts      # CLI 目录路径解析
│   ├── core/                # 核心逻辑
│   │   ├── installer.ts     # 安装/更新逻辑
│   │   ├── git.ts           # Git 操作
│   │   └── source.ts        # 源信息管理
│   ├── types/               # 类型定义
│   │   └── index.ts
│   └── utils/               # 工具函数
│       ├── logger.ts        # 日志（支持 --verbose）
│       └── errors.ts        # 错误处理
├── .skills.json             # 项目配置示例
└── README.md
```

## 配置文件

### 全局配置 `~/.skills-manager/config.json`

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

### 项目配置 `.skills.json`（项目根目录）

```json
{
  "skills": [
    {
      "name": "my-team-review",
      "source": "https://github.com/my-team/skills.git",
      "path": "review/SKILL.md",
      "cli": "claude-code"
    },
    {
      "name": "deploy-script",
      "source": "./local-skills/deploy",
      "cli": "opencode"
    }
  ]
}
```

### 技能源信息 `<skill-dir>/.source.json`

```json
{
  "source": "https://github.com/my-team/skills.git",
  "commit": "a1b2c3d4e5f6...",
  "branch": "main",
  "path": "review/SKILL.md",
  "installedAt": "2026-01-30T10:00:00Z"
}
```

## 核心数据流

### 安装流程 (`install`)

1. 解析源（GitHub URL 或本地路径）
2. 检测 CLI 类型（从参数或默认）
3. 克隆/复制技能目录到目标位置
4. 读取 git 信息（commit、branch）
5. 生成 `.source.json` 写入技能目录
6. 验证 `SKILL.md` 存在

### 更新流程 (`update`)

1. 读取 `.source.json` 获取源信息
2. 拉取最新代码或切换到指定分支
3. 对比新旧 commit，显示变更摘要
4. 询问是否继续
5. 更新 `.source.json` 中的 commit

### Diff 流程 (`diff`)

1. 读取 `.source.json` 获取安装时的 commit
2. 执行 `git diff <installed-commit>...HEAD`
3. 格式化输出差异

### Sync 流程 (`sync`)

1. 读取项目 `.skills.json`
2. 遍历技能列表：
   - 已安装 → 执行 update
   - 未安装 → 执行 install
3. 汇总结果

## 错误处理策略

### 错误分类

- **配置错误** - 配置文件格式错误、路径不存在
- **网络错误** - Git 克隆失败、GitHub API 调用失败
- **文件系统错误** - 权限问题、磁盘空间不足
- **技能错误** - SKILL.md 缺失、格式不正确

### 输出模式

- 默认模式：简洁的错误信息 + 修复建议
- `--verbose` 模式：完整错误堆栈 + 调试日志

### 错误示例

```bash
# 默认输出
Error: Git clone failed
Suggestion: Check network connection or verify repository URL
Run with --verbose for more details

# --verbose 输出
Error: Git clone failed
Repository: https://github.com/private/skills.git
Command: git clone https://github.com/private/skills.git /tmp/skills
Exit code: 128
Stderr: fatal: could not read Username for 'https://github.com': terminal prompts disabled

Suggestion: Set GITHUB_TOKEN environment variable or configure git credential helper
```

## 命令参数设计

### install

```bash
skills-manager install <source> [options]

source:
  - GitHub URL: https://github.com/user/repo.git
  - Local path: ./local-skill

options:
  --name <name>          指定技能名称（默认用目录名）
  --path <path>          仓库内的子路径（如 skills/review）
  --cli <cli>            目标 CLI：claude-code | opencode
  --branch <branch>      指定分支（默认 main）
  --verbose              详细输出
```

### update

```bash
skills-manager update <skill-name> [options]

options:
  --branch <branch>      切换到指定分支
  --commit <hash>        更新到指定 commit
  --verbose              详细输出
```

### uninstall

```bash
skills-manager uninstall <skill-name>

options:
  --force                跳过确认
  --verbose              详细输出
```

### list

```bash
skills-manager list [options]

options:
  --cli <cli>            只显示指定 CLI 的技能
  --format json|table    输出格式
```

### diff

```bash
skills-manager diff <skill-name> [options]

options:
  --format diff|summary  diff 格式或变更摘要
```

### sync

```bash
skills-manager sync [options]

options:
  --dry-run              预览不会实际执行
  --verbose              详细输出
```

## CLI 目录路径解析

### 解析优先级

1. 项目配置 `.skills.json` 中的 `cli` 配置（如果存在）
2. 全局配置 `~/.skills-manager/config.json` 中的 `cli` 配置
3. 硬编码默认值：
   - `claude-code`: `~/.claude/skills`
   - `opencode`: `~/.opencode/skills`

### 路径解析逻辑

```typescript
// 从配置读取
const config = loadConfig(); // 先项目，后全局
let cliPath = config.cli[targetCli];

// 支持环境变量
if (!cliPath) {
  cliPath = process.env[`${targetCli.toUpperCase()}_SKILLS_PATH`];
}

// 使用默认值
if (!cliPath) {
  cliPath = `~/.${targetCli}/skills`;
}

// 扩展 ~ 为用户主目录
return expandHomeDir(cliPath);
```

### 环境变量支持

- `CLAUDE_CODE_SKILLS_PATH` - 覆盖 Claude Code 技能目录
- `OPENCODE_SKILLS_PATH` - 覆盖 OpenCode 技能目录

## 技术栈选型

**核心语言**：TypeScript - 类型安全，良好的 IDE 支持

**主要依赖**：
- `commander` - CLI 框架，参数解析
- `chalk` - 终端输出颜色
- `ora` - 加载动画
- `simple-git` - Git 操作封装
- `inquirer` - 交互式确认
- `dotenv` - 环境变量加载

**开发依赖**：
- `vitest` - 单元测试
- `tsup` - 打包构建
- `tsx` - TypeScript 执行

**为什么选这些**：
- `commander` - 业界标准，成熟稳定
- `simple-git` - 避免 shell 调用，跨平台兼容
- `vitest` - 快速，与 Vite 生态一致

## Git 操作封装

### 核心功能

```typescript
// 克隆仓库（支持认证）
async cloneRepo(url: string, targetDir: string, token?: string)

// 获取当前 commit 信息
async getCommitInfo(repoDir: string): Promise<CommitInfo>

// 拉取最新代码
async pullLatest(repoDir: string, branch?: string)

// 切换分支
async checkoutBranch(repoDir: string, branch: string)

// 比较两个 commit 之间的差异
async diffCommits(repoDir: string, from: string, to: string): Promise<string>

// 获取远程更新
async fetchUpdates(repoDir: string): Promise<boolean>
```

### 认证处理

1. 优先使用 `GITHUB_TOKEN` 环境变量
2. 回退到 git credential helper
3. 在 URL 中嵌入 token：`https://<token>@github.com/user/repo.git`

### 子目录支持

- 克隆到临时目录
- 将指定子目录（`--path` 参数）复制到最终位置
- 删除临时目录

## 测试策略

### 测试层级

1. **单元测试** (`src/**/*.test.ts`)
   - 配置加载与解析
   - 路径处理与扩展
   - 错误格式化
   - Git 操作的 mock 测试

2. **集成测试** (`tests/integration/`)
   - 完整的 install/uninstall 流程
   - update/diff 流程
   - sync 命令测试
   - 使用临时目录和本地 git 仓库模拟

3. **E2E 测试** (`tests/e2e/`)
   - 真实 GitHub 仓库操作（使用测试仓库）
   - 配置文件交互测试

### 测试工具

- `vitest` - 运行测试
- `tmp` - 创建临时测试目录
- `msw` - Mock Service Worker（可选，用于网络请求 mock）

### 测试覆盖率目标

>80%

## 技能验证

### 安装后验证

1. 检查 `SKILL.md` 是否存在
2. 解析 frontmatter，验证必需字段
3. 检查是否有脚本文件，验证可执行权限

### Frontmatter 验证

```typescript
interface SkillFrontmatter {
  name?: string;
  description?: string;
  disable-model-invocation?: boolean;
  user-invocable?: boolean;
  allowed-tools?: string[];
  model?: string;
  context?: 'fork';
  agent?: string;
}
```

### 验证规则

- `name`：如果存在，只允许小写字母、数字、连字符
- `description`：推荐存在
- `allowed-tools`：如果存在，必须是已知工具名称

### 错误处理

- 警告：非致命问题（如缺少 description）
- 错误：致命问题（如 SKILL.md 不存在），终止安装

## 使用示例

### 安装 GitHub 技能

```bash
# 安装到默认 CLI (claude-code)
npx skills-manager install https://github.com/my-team/review-skill.git

# 指定子路径
npx skills-manager install https://github.com/my-team/skills.git --path review/SKILL.md

# 安装到 opencode
npx skills-manager install ./local-skill --cli opencode --name my-skill
```

### 更新技能

```bash
# 更新到最新
npx skills-manager update review-skill

# 切换分支并更新
npx skills-manager update review-skill --branch feature/new-review

# 查看变更摘要
npx skills-manager diff review-skill --format summary
```

### 列出技能

```bash
# 列出所有
npx skills-manager list

# 只看 opencode 的技能
npx skills-manager list --cli opencode

# JSON 格式输出
npx skills-manager list --format json
```

### 项目同步

```bash
# 预览变更
npx skills-manager sync --dry-run

# 执行同步
npx skills-manager sync
```

## 发布计划

### 版本策略

语义化版本 (SemVer)
- Major：破坏性变更
- Minor：新功能
- Patch：Bug 修复

### 发布流程

1. 更新 `package.json` 版本号
2. 更新 `CHANGELOG.md`
3. `npm run build` 构建产物
4. `npm publish` 发布到 npm

### 初期版本规划

- `v0.1.0` - MVP：install/uninstall/list + 基础配置
- `v0.2.0` - update/diff 功能
- `v0.3.0` - sync 功能
- `v1.0.0` - 稳定版：完整功能 + 文档完善

### 文档

- README - 快速开始
- CONTRIBUTING.md - 贡献指南
- docs/ - 详细文档

## 后续扩展方向

### 短期扩展（v1.1 - v1.5）

- `search` 命令 - 搜索公共技能仓库
- `export` 命令 - 导出已安装技能列表为配置
- `--global` 标志 - 安装到全局而非项目配置
- 技能依赖管理 - 自动安装技能依赖的其他技能

### 中期扩展（v2.0）

- 插件系统 - 支持自定义命令和 hooks
- 技能市场 - 官方技能发现和评分
- 版本锁定 - 支持固定特定 commit 版本
- 多环境配置 - dev/staging/prod 不同技能集合

### 长期扩展

- Web UI - 图形化技能管理界面
- 团队协作 - 审核流程、技能推荐
- CI/CD 集成 - 自动同步技能到部署环境

## 总结

Skills Manager 是一个面向团队的 npm 包，用于统一管理 Claude Code 和 OpenCode 的技能。

### 核心特性

- 从 GitHub 或本地路径安装技能
- 支持多个 CLI（Claude Code、OpenCode）
- Git 版本追踪和差异对比
- 项目级配置，支持团队技能共享
- 灵活的配置管理（全局 + 项目）
- 完善的错误处理和日志

### 技术亮点

- TypeScript 类型安全
- 跨平台兼容
- 简洁易用的 CLI
- 完整的测试覆盖
