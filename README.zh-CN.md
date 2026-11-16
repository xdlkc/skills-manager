# Skills Manager

[English](./README.md) | 简体中文

面向团队协作的 TypeScript CLI 工具（`v0.1.0`），用于在 **Claude Code** 与 **OpenCode** 之间安装、列出和卸载 AI CLI Skills，并自动写入 `.source.json` 记录 Git 来源与版本信息。

## 核心特性

- **双 CLI 目录支持**：统一管理 `claude-code`（默认 `~/.claude/skills`）与 `opencode`（默认 `~/.opencode/skills`）技能目录。
- **Git 与本地来源安装**：支持从远程 Git 仓库（指定 `--branch` 与 `--path` 子目录）或本地路径（`./`、`/`、`~/`）安装。
- **Skill 校验与溯源**：安装后校验目标目录内是否存在 `SKILL.md`，并写入 `.source.json`（记录 `source`、`commit`、`branch`、`path`、`installedAt`）。
- **结构化清单输出**：支持按 CLI 过滤已安装技能，并以终端表格或 JSON（`--format json`）格式输出。
- **配置与 Schema 校验**：支持环境变量覆盖、全局配置（`~/.skills-manager/config.json`）以及带校验的项目级 `.skills.json` 配置加载器（`loadProjectConfig` / `validateSkillConfig`）。

## 安装方式

前置环境：**Node.js 18+** 与 `git`。

### 从源码安装（当前 v0.1.0 推荐）

```bash
git clone https://github.com/xdlkc/skills-manager.git
cd skills-manager
npm install
npm run build
npm link          # 注册全局 `skills-manager` 命令
```

也可不全局链接直接运行：

```bash
node dist/index.js --help
# 或在开发阶段直接执行 TypeScript 源码：
npm run dev -- --help
```

若已发布至 npm 仓库，可通过包管理器安装或临时调用：

```bash
npm install -g skills-manager
# 或：npx skills-manager <command>
```

## CLI 用法

### `install <source>`

从 Git 仓库 URL 或本地路径（`./`、`/`、`~/`）安装 skill：

```bash
# 从 GitHub 安装（默认 --cli claude-code --branch main）
skills-manager install https://github.com/user/skill.git

# 从本地目录安装
skills-manager install ./local-skill

# 指定安装名称、目标 CLI、分支与仓库内子目录
skills-manager install https://github.com/user/skills-monorepo.git \
  --name my-skill \
  --cli opencode \
  --branch develop \
  --path skills/review \
  --verbose
```

参数说明：

| 参数 | 说明 | 默认值 |
|---|---|---|
| `--name <name>` | 目标 skill 目录名 | GitHub 仓库名或本地目录名 |
| `--path <path>` | 仓库或本地目录中包含 `SKILL.md` 的子目录路径 | 仓库/源根目录 |
| `--cli <cli>` | 目标 CLI（`claude-code` 或 `opencode`） | `claude-code` |
| `--branch <branch>` | 要克隆的 Git 分支 | `main` |
| `--verbose` | 输出详细错误上下文 | `false` |

### `list`

列出当前已安装的 skills：

```bash
skills-manager list
skills-manager list --cli claude-code
skills-manager list --format json
```

参数说明：

| 参数 | 说明 | 默认值 |
|---|---|---|
| `--cli <cli>` | 按 `claude-code` 或 `opencode` 过滤 | 同时列出两者 |
| `--format <format>` | 输出格式（`table` 或 `json`） | `table` |
| `--verbose` | 输出详细错误信息 | `false` |

### `uninstall <skill-name>`

卸载已安装的 skill 目录：

```bash
skills-manager uninstall my-skill
skills-manager uninstall my-skill --cli opencode --force
```

参数说明：

| 参数 | 说明 | 默认值 |
|---|---|---|
| `--cli <cli>` | 目标 CLI（`claude-code` 或 `opencode`） | `claude-code` |
| `--force` | 跳过确认提示 | `false` |
| `--verbose` | 输出详细错误信息 | `false` |

> **当前实现状态说明**：[`src/core/git.ts`](./src/core/git.ts)、[`src/config/loader.ts`](./src/config/loader.ts) 与 [`src/types/index.ts`](./src/types/index.ts) 已预留了 `update`、`diff` 与 `sync` 所需的 Git/配置基础设施（详见设计文档 [`docs/plans/2026-01-30-skills-manager-design.md`](./docs/plans/2026-01-30-skills-manager-design.md)），但 [`src/index.ts`](./src/index.ts) 当前对外暴露的 CLI 命令为 `install`、`uninstall` 与 `list`。

## 配置说明

### CLI 路径解析优先级

[`src/config/loader.ts`](./src/config/loader.ts) 中的 `resolveCliPath()` 按以下顺序解析目标技能目录：

1. 环境变量（`CLAUDE_CODE_SKILLS_PATH` 或 `OPENCODE_SKILLS_PATH`，通过 `dotenv` 自动加载）
2. 全局配置（`~/.skills-manager/config.json` 中的 `cli.<cli>`）
3. 内置默认路径（`~/.claude/skills` 与 `~/.opencode/skills`）

### 全局配置（`~/.skills-manager/config.json`）

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

### 项目配置 Schema（`.skills.json`）

由 [`src/config/loader.ts`](./src/config/loader.ts) 中的 `loadProjectConfig()` 与 `validateSkillConfig()` 校验：

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

每条记录必须包含 `name`（字符串）、`source`（Git URL 或本地路径）、`cli`（`"claude-code"` 或 `"opencode"`），以及可选的 `path`（含 `SKILL.md` 的子目录路径）。

### 已安装溯源元数据（`.source.json`）

由 `installSkill()` 自动写入每个已安装 skill 目录：

```json
{
  "source": "https://github.com/user/skill.git",
  "commit": "a1b2c3d4...",
  "branch": "main",
  "path": "skills/review",
  "installedAt": "2026-01-30T10:00:00.000Z"
}
```

### 环境变量

| 变量名 | 说明 |
|---|---|
| `GITHUB_TOKEN` | 访问私有 GitHub 仓库时自动注入 HTTPS 克隆地址的令牌 |
| `CLAUDE_CODE_SKILLS_PATH` | 覆盖 Claude Code 默认 skills 目录 |
| `OPENCODE_SKILLS_PATH` | 覆盖 OpenCode 默认 skills 目录 |

## 本地开发

```bash
npm install
npm test             # 运行 Vitest 单元测试（默认 watch 模式，单次执行可传 run）
npm run test:ui      # 启动 Vitest 可视化界面
npm run test:coverage
npm run build        # 使用 tsup 构建 ESM 产物与类型声明到 dist/
npm run dev -- list  # 通过 tsx 直接运行 TypeScript 源码
```

## 目录结构

```text
skills-manager/
├── README.md
├── README.zh-CN.md
├── package.json
├── bin/skills-manager              # 调用 dist/index.js 的 CLI 入口封装
├── dist/                           # tsup 构建产物与 .d.ts 声明文件
├── docs/plans/                     # 设计文档
└── src/
    ├── index.ts                    # Commander CLI 入口（install、uninstall、list）
    ├── commands/list.ts            # 已安装技能扫描与 .source.json 解析
    ├── config/loader.ts            # 全局/项目配置加载与 CLI 路径解析
    ├── core/
    │   ├── git.ts                  # simple-git 封装（克隆、commit 查询、pull、diff）
    │   └── installer.ts            # skill 复制、SKILL.md 校验与 .source.json 写入
    ├── types/index.ts              # TypeScript 类型定义
    └── utils/
        ├── errors.ts               # SkillsManagerError 统一错误处理与格式化
        └── paths.ts                # 主目录展开与配置路径辅助函数
```

## 许可证

ISC（见 [`package.json`](./package.json)）
