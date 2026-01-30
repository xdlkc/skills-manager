#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";

// src/core/installer.ts
import { mkdir, cp, access as access2, writeFile, rm } from "fs/promises";
import { join as join2, basename } from "path";
import { existsSync } from "fs";

// src/core/git.ts
import simpleGit from "simple-git";

// src/utils/errors.ts
var SkillsManagerError = class extends Error {
  type;
  suggestion;
  details;
  constructor(message, type = "GENERIC" /* Generic */, suggestion, details) {
    super(message);
    this.name = "SkillsManagerError";
    this.type = type;
    this.suggestion = suggestion;
    this.details = details;
  }
};
function formatError(error, verbose = false) {
  if (error instanceof SkillsManagerError) {
    let output = `Error: ${error.message}
`;
    if (error.suggestion) {
      output += `Suggestion: ${error.suggestion}
`;
    }
    if (verbose) {
      output += `
Type: ${error.type}
`;
      if (error.details) {
        output += `Details: ${JSON.stringify(error.details, null, 2)}
`;
      }
      if (error.stack) {
        output += `
${error.stack}
`;
      }
    }
    return output;
  }
  if (error instanceof Error) {
    let output = `Error: ${error.message}
`;
    if (verbose && error.stack) {
      output += `
${error.stack}
`;
    }
    return output;
  }
  return `Unknown error: ${String(error)}
`;
}

// src/core/git.ts
var GitClient = class {
  git;
  constructor(workDir) {
    this.git = simpleGit(workDir);
  }
  /**
   * 克隆仓库
   */
  async cloneRepo(url, targetDir, options) {
    try {
      const authUrl = options?.token ? this.injectToken(url, options.token) : url;
      if (options?.branch) {
        await this.git.clone(authUrl, targetDir, ["--branch", options.branch, "--single-branch"]);
      } else {
        await this.git.clone(authUrl, targetDir);
      }
    } catch (error) {
      throw new SkillsManagerError(
        `Failed to clone repository: ${url}`,
        "NETWORK" /* Network */,
        "Check the URL, network connection, and authentication",
        { url, targetDir }
      );
    }
  }
  /**
   * 获取当前 commit 信息
   */
  async getCommitInfo() {
    try {
      const log = await this.git.log({ maxCount: 1 });
      const latest = log.latest;
      if (!latest) {
        throw new SkillsManagerError("No commits found in repository", "GENERIC" /* Generic */);
      }
      const branches = await this.git.branch();
      const currentBranch = branches.current || "main";
      return {
        hash: latest.hash,
        message: latest.message,
        date: latest.date,
        branch: currentBranch
      };
    } catch (error) {
      if (error instanceof SkillsManagerError) throw error;
      throw new SkillsManagerError(
        "Failed to get commit info",
        "GENERIC" /* Generic */,
        "Ensure the directory is a valid git repository"
      );
    }
  }
  /**
   * 拉取最新代码
   */
  async pullLatest(branch) {
    try {
      if (branch) {
        await this.git.checkout(branch);
      }
      await this.git.pull();
    } catch (error) {
      throw new SkillsManagerError(
        "Failed to pull latest changes",
        "NETWORK" /* Network */,
        "Check network connection and authentication"
      );
    }
  }
  /**
   * 切换分支
   */
  async checkoutBranch(branch) {
    try {
      const branches = await this.git.branch(["-r"]);
      const remoteBranches = Object.keys(branches.branches);
      const targetBranch = remoteBranches.find((b) => b.endsWith(branch));
      if (targetBranch) {
        await this.git.checkout(["-B", branch, `origin/${branch}`]);
      } else {
        await this.git.checkout(branch);
      }
    } catch (error) {
      throw new SkillsManagerError(
        `Failed to checkout branch: ${branch}`,
        "GENERIC" /* Generic */,
        "Check if the branch exists"
      );
    }
  }
  /**
   * 比较两个 commit 之间的差异
   */
  async diffCommits(from, to = "HEAD") {
    try {
      const diff = await this.git.diff([`${from}...${to}`]);
      return diff;
    } catch (error) {
      throw new SkillsManagerError(
        "Failed to get diff",
        "GENERIC" /* Generic */,
        "Ensure the commits exist"
      );
    }
  }
  /**
   * 检查是否有远程更新
   */
  async hasUpdates() {
    try {
      await this.git.fetch();
      const status = await this.git.status();
      return status.behind > 0 || status.ahead > 0;
    } catch (error) {
      throw new SkillsManagerError(
        "Failed to check for updates",
        "NETWORK" /* Network */,
        "Check network connection and authentication"
      );
    }
  }
  /**
   * 获取文件变更摘要
   */
  async getDiffSummary(from, to = "HEAD") {
    try {
      const summary = await this.git.diffSummary([`${from}...${to}`]);
      return {
        files: summary.files.map((f) => ({
          file: f.file,
          changes: f.changes,
          insertions: f.insertions,
          deletions: f.deletions
        })),
        changed: summary.changed,
        insertions: summary.insertions,
        deletions: summary.deletions
      };
    } catch (error) {
      throw new SkillsManagerError(
        "Failed to get diff summary",
        "GENERIC" /* Generic */
      );
    }
  }
  /**
   * 在 URL 中注入 token
   */
  injectToken(url, token) {
    if (url.startsWith("https://")) {
      return url.replace("https://", `https://${token}@`);
    }
    return url;
  }
};

// src/config/loader.ts
import { readFile, access } from "fs/promises";
import dotenv from "dotenv";

// src/utils/paths.ts
import { homedir } from "os";
import { join } from "path";
function expandHomeDir(path) {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  if (path === "~") {
    return homedir();
  }
  return path;
}
function getGlobalConfigPath() {
  return join(homedir(), ".skills-manager", "config.json");
}

// src/config/loader.ts
var DEFAULT_CLI_PATHS = {
  "claude-code": "~/.claude/skills",
  opencode: "~/.opencode/skills"
};
var DEFAULT_GLOBAL_CONFIG = {
  cli: DEFAULT_CLI_PATHS
};
async function loadGlobalConfig() {
  const configPath = getGlobalConfigPath();
  try {
    if (!await fileExists(configPath)) {
      return DEFAULT_GLOBAL_CONFIG;
    }
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    return {
      cli: {
        ...DEFAULT_CLI_PATHS,
        ...config.cli
      },
      auth: config.auth
    };
  } catch (error) {
    throw new SkillsManagerError(
      "Failed to load global config",
      "CONFIG" /* Config */,
      "Check ~/.skills-manager/config.json format",
      { path: configPath }
    );
  }
}
async function resolveCliPath(cliType, cwd) {
  dotenv.config();
  const envVar = `${cliType.toUpperCase().replace("-", "_")}_SKILLS_PATH`;
  if (process.env[envVar]) {
    return expandHomeDir(process.env[envVar]);
  }
  const globalConfig = await loadGlobalConfig();
  if (globalConfig.cli[cliType]) {
    return expandHomeDir(globalConfig.cli[cliType]);
  }
  return expandHomeDir(DEFAULT_CLI_PATHS[cliType]);
}
async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// src/core/installer.ts
async function installSkill(source, options = {}) {
  const { name, path: subPath, cli = "claude-code", branch } = options;
  const targetCliPath = await resolveCliPath(cli);
  const skillName = name || extractNameFromSource(source);
  const targetDir = join2(targetCliPath, skillName);
  if (existsSync(targetDir)) {
    throw new SkillsManagerError(
      `Skill already installed: ${skillName}`,
      "SKILL" /* Skill */,
      "Use update command to update existing skill"
    );
  }
  await mkdir(targetCliPath, { recursive: true });
  const isLocal = isLocalPath(source);
  let tempDir = "";
  try {
    if (isLocal) {
      await copyLocalSkill(source, targetDir, subPath);
    } else {
      tempDir = `/tmp/skills-install-${Date.now()}`;
      const git = new GitClient();
      await git.cloneRepo(source, tempDir, {
        token: process.env.GITHUB_TOKEN,
        branch
      });
      if (subPath) {
        await copySubPath(tempDir, subPath, targetDir);
      } else {
        await cp(tempDir, targetDir, { recursive: true });
      }
    }
    await validateSkill(targetDir);
    const sourceInfo = {
      source,
      commit: isLocal ? "" : await getGitCommit(tempDir),
      branch: branch || "main",
      path: subPath,
      installedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await writeFile(
      join2(targetDir, ".source.json"),
      JSON.stringify(sourceInfo, null, 2)
    );
    console.log(`\u2713 Skill installed: ${skillName}`);
  } finally {
    if (tempDir && existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
async function uninstallSkill(skillName, cli = "claude-code", force = false) {
  const targetCliPath = await resolveCliPath(cli);
  const targetDir = join2(targetCliPath, skillName);
  if (!existsSync(targetDir)) {
    throw new SkillsManagerError(
      `Skill not found: ${skillName}`,
      "SKILL" /* Skill */
    );
  }
  if (!force) {
    console.log(`Uninstalling skill: ${skillName}`);
  }
  await rm(targetDir, { recursive: true, force: true });
  console.log(`\u2713 Skill uninstalled: ${skillName}`);
}
function extractNameFromSource(source) {
  if (isLocalPath(source)) {
    return basename(source);
  }
  const match = source.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (match) {
    return match[2];
  }
  throw new SkillsManagerError(
    "Could not extract skill name from source",
    "CONFIG" /* Config */,
    "Use --name to specify the skill name"
  );
}
function isLocalPath(source) {
  return source.startsWith("./") || source.startsWith("/") || source.startsWith("~/");
}
async function copyLocalSkill(source, targetDir, subPath) {
  const sourcePath = subPath ? join2(source, subPath) : source;
  if (!existsSync(sourcePath)) {
    throw new SkillsManagerError(
      `Source path not found: ${sourcePath}`,
      "FILE_SYSTEM" /* FileSystem */
    );
  }
  await cp(sourcePath, targetDir, { recursive: true });
}
async function copySubPath(sourceDir, subPath, targetDir) {
  const sourcePath = join2(sourceDir, subPath);
  if (!existsSync(sourcePath)) {
    throw new SkillsManagerError(
      `Subpath not found in repository: ${subPath}`,
      "SKILL" /* Skill */
    );
  }
  await cp(sourcePath, targetDir, { recursive: true });
}
async function validateSkill(skillDir) {
  const skillFilePath = join2(skillDir, "SKILL.md");
  try {
    await access2(skillFilePath);
  } catch {
    throw new SkillsManagerError(
      "SKILL.md not found",
      "SKILL" /* Skill */,
      "Ensure the skill directory contains a SKILL.md file"
    );
  }
}
async function getGitCommit(repoDir) {
  try {
    const git = new GitClient(repoDir);
    const info = await git.getCommitInfo();
    return info.hash;
  } catch {
    return "";
  }
}

// src/commands/list.ts
import { readdir, readFile as readFile3 } from "fs/promises";
import { join as join3 } from "path";
import { existsSync as existsSync2 } from "fs";
async function listSkills(options = {}) {
  const { cli, format = "table" } = options;
  const cliType = cli;
  const skills = [];
  const cliTypes = cliType ? [cliType] : ["claude-code", "opencode"];
  for (const cliType2 of cliTypes) {
    const skillsPath = await resolveCliPath(cliType2);
    if (existsSync2(skillsPath)) {
      const entries = await readdir(skillsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillDir = join3(skillsPath, entry.name);
          const skillInfo = await getSkillInfo(skillDir, cliType2);
          if (skillInfo) {
            skills.push(skillInfo);
          }
        }
      }
    }
  }
  return skills;
}
async function getSkillInfo(skillDir, cli) {
  const sourceFile = join3(skillDir, ".source.json");
  if (!existsSync2(sourceFile)) {
    return {
      name: getSkillName(skillDir),
      cli,
      source: "unknown",
      installedAt: "unknown"
    };
  }
  try {
    const sourceInfo = JSON.parse(await readFile3(sourceFile, "utf-8"));
    return {
      name: getSkillName(skillDir),
      cli,
      source: sourceInfo.source,
      commit: sourceInfo.commit,
      branch: sourceInfo.branch,
      installedAt: sourceInfo.installedAt
    };
  } catch {
    return null;
  }
}
function getSkillName(skillDir) {
  return skillDir.split("/").pop() || "unknown";
}

// src/index.ts
import chalk from "chalk";
var program = new Command();
program.name("skills-manager").description("Manage AI CLI skills for team collaboration").version("0.1.0");
program.command("install <source>").description("Install a skill from a Git repository or local path").option("--name <name>", "Skill name (default: extracted from source)").option("--path <path>", "Subpath in repository").option("--cli <cli>", "Target CLI (claude-code or opencode)", "claude-code").option("--branch <branch>", "Git branch (default: main)", "main").option("--verbose", "Verbose output").action(async (source, options) => {
  try {
    await installSkill(source, options);
  } catch (error) {
    console.error(chalk.red(formatError(error, options.verbose)));
    process.exit(1);
  }
});
program.command("uninstall <skill-name>").description("Uninstall a skill").option("--cli <cli>", "Target CLI (claude-code or opencode)", "claude-code").option("--force", "Skip confirmation").option("--verbose", "Verbose output").action(async (skillName, options) => {
  try {
    await uninstallSkill(skillName, options.cli, options.force);
  } catch (error) {
    console.error(chalk.red(formatError(error, options.verbose)));
    process.exit(1);
  }
});
program.command("list").description("List installed skills").option("--cli <cli>", "Filter by CLI").option("--format <format>", "Output format (table or json)", "table").option("--verbose", "Verbose output").action(async (options) => {
  try {
    const skills = await listSkills(options);
    if (options.format === "json") {
      console.log(JSON.stringify(skills, null, 2));
    } else {
      if (skills.length === 0) {
        console.log("No skills installed.");
        return;
      }
      console.log("\nInstalled Skills:");
      console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      for (const skill of skills) {
        console.log(`  ${chalk.green(skill.name)}`);
        console.log(`    CLI: ${skill.cli}`);
        console.log(`    Source: ${skill.source}`);
        if (skill.commit) {
          console.log(`    Commit: ${skill.commit.substring(0, 7)}`);
        }
        if (skill.branch) {
          console.log(`    Branch: ${skill.branch}`);
        }
        console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      }
      console.log(`
Total: ${skills.length} skill(s)`);
    }
  } catch (error) {
    console.error(chalk.red(formatError(error, options.verbose)));
    process.exit(1);
  }
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map