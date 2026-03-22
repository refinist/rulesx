# rulesx

[![npm](https://img.shields.io/npm/v/rulesx.svg?colorA=2c2a22&colorB=f8f8f6)](https://npmjs.com/package/rulesx) [![Unit Test](https://img.shields.io/github/actions/workflow/status/refinist/rulesx/unit-test.yml?colorA=2c2a22&colorB=f8f8f6&label=Unit%20Test)](https://github.com/refinist/rulesx/actions/workflows/unit-test.yml) [![codecov](https://img.shields.io/codecov/c/github/refinist/rulesx?colorA=2c2a22&colorB=f8f8f6)](https://codecov.io/github/refinist/rulesx)

从 git 仓库安装 AI 智能体规则的轻量级 CLI 工具。

[English](./README.md) | **中文**

## 什么是 rulesx?

**rulesx** 是一个轻量级 CLI 工具，用于从任意 git 仓库安装 `.mdc` 规则文件和 AI 智能体配置文件到你的项目中。支持 Cursor 规则（`.cursor/rules/`）以及根目录级别的智能体文件，如 `AGENTS.md`、`CLAUDE.md` 等。

## 安装

无需安装，直接使用 `npx` 运行：

```bash
npx rulesx add <source>
```

或全局安装：

```bash
npm i -g rulesx
```

## 使用方式

```bash
rulesx add <source> [--rule '<pattern>']
```

### 源格式

| 格式            | 示例                                       |
| --------------- | ------------------------------------------ |
| GitHub 简写     | `rulesx add owner/repo`                    |
| 完整 GitHub URL | `rulesx add https://github.com/owner/repo` |
| GitLab URL      | `rulesx add https://gitlab.com/org/repo`   |
| SSH URL         | `rulesx add git@github.com:owner/repo.git` |
| 任意 git URL    | `rulesx add https://host.com/org/repo.git` |
| 本地目录        | `rulesx add ./my-local-rules`              |

### 示例

```bash
# 交互模式 — 选择要安装的规则
rulesx add owner/repo

# 安装所有规则
rulesx add owner/repo --rule '*'

# 安装指定规则
rulesx add owner/repo --rule 'api-docs'

# 通过 glob 模式匹配安装
rulesx add owner/repo --rule 'react-*'

# 从私有 git 仓库安装（带凭证）
rulesx add https://user:token@git.example.com/org/rules.git --rule '*'

# 从本地目录安装
rulesx add ./my-rules --rule 'eslint'
```

## 工作原理

1. 浅克隆目标仓库（`--depth 1`）
2. 扫描 `rules/` 目录下的 `.mdc` 文件
3. 检测根目录级别的智能体文件（`AGENTS.md`、`CLAUDE.md` 等）
4. 提示用户选择（或使用 `--rule` 模式过滤）
5. 将匹配的文件复制到当前项目

### 文件放置位置

| 文件类型                     | 安装目标         |
| ---------------------------- | ---------------- |
| `.mdc` 文件（来自 `rules/`） | `.cursor/rules/` |
| 根目录级别智能体文件         | 项目根目录       |

## 支持的智能体文件

以下根目录级别的智能体配置文件会被自动检测：

| 文件             | 智能体                                                        |
| ---------------- | ------------------------------------------------------------- |
| `AGENTS.md`      | OpenAI Codex、GitHub Copilot、Cursor、Windsurf、Amp、Devin 等 |
| `CLAUDE.md`      | Claude Code                                                   |
| `.cursorrules`   | Cursor（旧版）                                                |
| `.windsurfrules` | Windsurf / Codeium                                            |
| `.clinerules`    | Cline                                                         |
| `.roorules`      | Roo Code（旧版）                                              |
| `.kilocoderules` | KiloCode（旧版）                                              |
| `GEMINI.md`      | Gemini / OpenCode                                             |

## 规则仓库结构

你的规则仓库应遵循以下结构：

```
my-rules/
├── rules/
│   ├── api-docs.mdc
│   ├── eslint.mdc
│   └── react-hooks.mdc
├── AGENTS.md          # 可选
├── CLAUDE.md          # 可选
└── ...
```

每个 `.mdc` 文件可以包含带 `description` 字段的 YAML frontmatter，该描述会在交互选择时显示：

```markdown
---
description: OpenAPI 集成的接口文档规则
alwaysApply: true
---

# 你的规则内容
```

## 环境要求

- Node.js >= 18
- Git

## 许可证

[MIT](./LICENSE) - 由 [REFINIST](https://github.com/refinist) 开发
