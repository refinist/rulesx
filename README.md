<pre align="center">
██████╗  ██╗   ██╗ ██╗      ███████╗ ███████╗ ██╗  ██╗
██╔══██╗ ██║   ██║ ██║      ██╔════╝ ██╔════╝ ╚██╗██╔╝
██████╔╝ ██║   ██║ ██║      █████╗   ███████╗  ╚███╔╝
██╔══██╗ ██║   ██║ ██║      ██╔══╝   ╚════██║  ██╔██╗
██║  ██║ ╚██████╔╝ ███████╗ ███████╗ ███████║ ██╔╝ ██╗
╚═╝  ╚═╝  ╚═════╝  ╚══════╝ ╚══════╝ ╚══════╝ ╚═╝  ╚═╝
</pre>

<p align="center"><i>Install rules like you install skills.</i></p>

<p align="center">
  <a href="https://npmjs.com/package/rulesx"><img src="https://img.shields.io/npm/v/rulesx.svg?colorA=2c2a22&colorB=f8f8f6" alt="npm" /></a>
  <a href="https://github.com/refinist/rulesx/actions/workflows/unit-test.yml"><img src="https://img.shields.io/github/actions/workflow/status/refinist/rulesx/unit-test.yml?colorA=2c2a22&colorB=f8f8f6&label=Unit%20Test" alt="Unit Test" /></a>
  <a href="https://codecov.io/github/refinist/rulesx"><img src="https://img.shields.io/codecov/c/github/refinist/rulesx?colorA=2c2a22&colorB=f8f8f6" alt="codecov" /></a>
</p>

**English** | [中文](./README.zh-CN.md)

## What is rulesx?

**rulesx** is a lightweight CLI tool that installs `.mdc` rule files and agent configuration files from any git repository into your project. It supports Cursor rules (`.cursor/rules/`) and root-level agent files like `AGENTS.md`, `CLAUDE.md`, and more.

## Install

No installation required — run directly with `npx`:

```bash
npx rulesx add <source>
```

Or install globally:

```bash
npm i -g rulesx
```

## Usage

```bash
rulesx add <source> [--rule '<pattern>']
```

### Source Formats

| Format           | Example                                    |
| ---------------- | ------------------------------------------ |
| GitHub shorthand | `rulesx add owner/repo`                    |
| Full GitHub URL  | `rulesx add https://github.com/owner/repo` |
| GitLab URL       | `rulesx add https://gitlab.com/org/repo`   |
| SSH URL          | `rulesx add git@github.com:owner/repo.git` |
| Any git URL      | `rulesx add https://host.com/org/repo.git` |
| Local directory  | `rulesx add ./my-local-rules`              |

### Examples

```bash
# Interactive mode — select which rules to install
rulesx add owner/repo

# Install all rules
rulesx add owner/repo --rule '*'

# Install a specific rule
rulesx add owner/repo --rule 'api-docs'

# Install rules matching a glob pattern
rulesx add owner/repo --rule 'react-*'

# From a private git repo with credentials
rulesx add https://user:token@git.example.com/org/rules.git --rule '*'

# From a local directory
rulesx add ./my-rules --rule 'eslint'
```

## How It Works

1. Clones the target repository (shallow, `--depth 1`)
2. Scans for `.mdc` files in the `rules/` directory
3. Detects root-level agent files (`AGENTS.md`, `CLAUDE.md`, etc.)
4. Prompts for selection (or uses `--rule` pattern to filter)
5. Copies matched files to your project

### File Placement

| File Type                    | Destination      |
| ---------------------------- | ---------------- |
| `.mdc` files (from `rules/`) | `.cursor/rules/` |
| Root-level agent files       | Project root     |

## Supported Agent Files

The following root-level agent configuration files are automatically detected:

| File             | Agent                                                            |
| ---------------- | ---------------------------------------------------------------- |
| `AGENTS.md`      | OpenAI Codex, GitHub Copilot, Cursor, Windsurf, Amp, Devin, etc. |
| `CLAUDE.md`      | Claude Code                                                      |
| `.cursorrules`   | Cursor (legacy)                                                  |
| `.windsurfrules` | Windsurf / Codeium                                               |
| `.clinerules`    | Cline                                                            |
| `.roorules`      | Roo Code (legacy)                                                |
| `.kilocoderules` | KiloCode (legacy)                                                |
| `GEMINI.md`      | Gemini / OpenCode                                                |

## Rule Repository Structure

Your rule repository should follow this structure:

```
my-rules/
├── rules/
│   ├── api-docs.mdc
│   ├── eslint.mdc
│   └── react-hooks.mdc
├── AGENTS.md          # optional
├── CLAUDE.md          # optional
└── ...
```

Each `.mdc` file can include YAML frontmatter with a `description` field, which will be displayed during interactive selection:

```markdown
---
description: API documentation rules for OpenAPI integration
alwaysApply: true
---

# Your rule content here
```

## Requirements

- Node.js >= 18
- Git

## License

[MIT](./LICENSE) - Made by [REFINIST](https://github.com/refinist)
