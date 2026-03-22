import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as p from '@clack/prompts';
import { minimatch } from 'minimatch';
import pc from 'picocolors';
import { ROOT_RULE_PATTERNS } from './constants.js';
import type { AddOptions, RuleItem } from './types.js';

// #F7F7F4 via ANSI 24-bit true color
const c = (s: string) => `\x1b[38;2;247;247;244m${s}\x1b[0m`;
const BANNER = `
${c('  ██████╗  ██╗   ██╗ ██╗      ███████╗ ███████╗ ██╗  ██╗')}
${c('  ██╔══██╗ ██║   ██║ ██║      ██╔════╝ ██╔════╝ ╚██╗██╔╝')}
${c('  ██████╔╝ ██║   ██║ ██║      █████╗   ███████╗  ╚███╔╝')}
${c('  ██╔══██╗ ██║   ██║ ██║      ██╔══╝   ╚════██║  ██╔██╗')}
${c('  ██║  ██║ ╚██████╔╝ ███████╗ ███████╗ ███████║ ██╔╝ ██╗')}
${c('  ╚═╝  ╚═╝  ╚═════╝  ╚══════╝ ╚══════╝ ╚══════╝ ╚═╝  ╚═╝')}
`;

function parseDescription(filePath: string): string | undefined {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match?.[1]) return undefined;
  const descMatch = match[1].match(/^description:\s*(.+)$/m);
  return descMatch?.[1]?.trim();
}

function maskUrl(url: string): string {
  return url.replace(/:\/\/([^@]+)@/, '://***@');
}

/**
 * Resolve source input to a git-cloneable URL or local path.
 *
 * Supported formats:
 *   owner/repo              → https://github.com/owner/repo.git
 *   https://github.com/o/r  → https://github.com/o/r.git
 *   https://gitlab.com/o/r  → https://gitlab.com/o/r.git
 *   git@github.com:o/r.git  → passed through
 *   https://.../*.git        → passed through
 *   ./local-path             → resolved to absolute, flagged as local
 */
function resolveSource(source: string): { url: string; isLocal: boolean } {
  // Local path
  if (
    source.startsWith('./') ||
    source.startsWith('/') ||
    source.startsWith('../') ||
    source.startsWith('~')
  ) {
    const resolved = source.startsWith('~')
      ? path.join(os.homedir(), source.slice(1))
      : path.resolve(source);
    return { url: resolved, isLocal: true };
  }

  // Already a full git URL (SSH or HTTPS with .git)
  if (source.startsWith('git@') || source.endsWith('.git')) {
    return { url: source, isLocal: false };
  }

  // Full GitHub/GitLab URL without .git
  if (source.startsWith('https://') || source.startsWith('http://')) {
    const url = source.replace(/\/$/, '');
    return { url: url.endsWith('.git') ? url : `${url}.git`, isLocal: false };
  }

  // GitHub shorthand: owner/repo
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(source)) {
    return { url: `https://github.com/${source}.git`, isLocal: false };
  }

  // Fallback: treat as git URL
  return { url: source, isLocal: false };
}

function cloneRepo(url: string, dest: string): void {
  try {
    execFileSync('git', ['clone', '--depth', '1', url, dest], {
      stdio: ['ignore', 'ignore', 'pipe']
    });
  } catch (e: any) {
    const stderr = e.stderr?.toString().trim() || e.message;
    throw new Error(`Failed to clone repository: ${stderr}`);
  }
}

function copyLocalSource(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    throw new Error(`Local path not found: ${src}`);
  }
  fs.cpSync(src, dest, { recursive: true });
}

export async function add(
  source: string,
  rulePattern?: string,
  options?: AddOptions
): Promise<void> {
  const cwd = options?.cwd ?? process.cwd();
  const ni = options?.nonInteractive ?? false;
  const { url, isLocal } = resolveSource(source);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-'));

  try {
    // Banner
    if (!ni) {
      console.log(BANNER);
      p.intro(pc.bgCyan(pc.black(' rules ')));
    }

    // Clone or copy
    if (!ni) p.log.info(`Source: ${pc.dim(isLocal ? url : maskUrl(url))}`);

    const fetchSource = () =>
      isLocal ? copyLocalSource(url, tempDir) : cloneRepo(url, tempDir);

    if (!ni) {
      const spinner = p.spinner();
      spinner.start(
        isLocal ? 'Copying from local path...' : 'Cloning repository...'
      );
      try {
        fetchSource();
        spinner.stop(isLocal ? 'Source copied' : 'Repository cloned');
      } catch (e) {
        spinner.stop(isLocal ? 'Copy failed' : 'Clone failed');
        throw e;
      }
    } else {
      fetchSource();
    }

    // Scan for all rule items
    const allItems: RuleItem[] = [];

    // 1. .mdc files from rules/ directory
    const rulesDir = path.join(tempDir, 'rules');
    if (fs.existsSync(rulesDir)) {
      const mdcFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.mdc'));
      for (const f of mdcFiles) {
        const src = path.join(rulesDir, f);
        allItems.push({
          file: f,
          src,
          label: f.replace(/\.mdc$/, ''),
          description: parseDescription(src),
          target: 'cursor'
        });
      }
    }

    // 2. Root-level rule files (glob patterns supported)
    const rootFiles = fs.readdirSync(tempDir);
    for (const rootFile of rootFiles) {
      const matched = ROOT_RULE_PATTERNS.some(pattern =>
        minimatch(rootFile, pattern)
      );
      if (matched) {
        const src = path.join(tempDir, rootFile);
        if (fs.statSync(src).isFile()) {
          allItems.push({
            file: rootFile,
            src,
            label: rootFile,
            description: parseDescription(src),
            target: 'root'
          });
        }
      }
    }

    if (allItems.length === 0) {
      throw new Error('No rules found in repository');
    }

    if (!ni) p.log.info(`Found ${pc.yellow(String(allItems.length))} rules`);

    // Determine which rules to install
    let matched: RuleItem[];

    if (rulePattern === '*') {
      if (!ni)
        p.log.info(
          `Installing all ${pc.yellow(String(allItems.length))} rules`
        );
      matched = allItems;
    } else if (rulePattern) {
      const matchPat = rulePattern.includes('.')
        ? rulePattern
        : `${rulePattern}.mdc`;
      matched = allItems.filter(
        item =>
          minimatch(item.file, matchPat) || minimatch(item.label, rulePattern!)
      );
      if (matched.length === 0) {
        const available = allItems.map(item => item.label).join(', ');
        throw new Error(
          `No rules matched pattern '${rulePattern}'. Available: ${available}`
        );
      }
    } else {
      // Interactive selection
      const selected = await p.multiselect({
        message: 'Select rules to install',
        options: allItems.map(item => {
          const targetHint =
            item.target === 'root' ? pc.cyan('→ root') : undefined;
          const desc = item.description;
          const hint = [desc, targetHint].filter(Boolean).join('  ');
          return {
            value: item.file,
            label: item.label,
            hint: hint || undefined
          };
        }),
        required: true
      });

      if (p.isCancel(selected)) {
        p.cancel('Installation cancelled.');
        process.exit(0);
      }

      const selectedFiles = new Set(selected as string[]);
      matched = allItems.filter(item => selectedFiles.has(item.file));
    }

    // Confirmation summary
    if (!ni) {
      const labels = matched.map(item => item.label);
      const summaryLines = [
        `${pc.bold('Rules:')}    ${labels.length > 3 ? `${labels.slice(0, 3).join(', ')} +${labels.length - 3} more` : labels.join(', ')}`,
        `${pc.bold('Target:')}   .cursor/rules/ & project root`
      ];
      p.note(summaryLines.join('\n'), 'Installation Summary');

      const confirm = await p.confirm({
        message: 'Proceed with installation?'
      });

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Installation cancelled.');
        process.exit(0);
      }
    }

    // Install
    const cursorDir = path.join(cwd, '.cursor', 'rules');
    if (matched.some(item => item.target === 'cursor')) {
      fs.mkdirSync(cursorDir, { recursive: true });
    }

    const installRules = () => {
      for (const item of matched) {
        const dest =
          item.target === 'cursor'
            ? path.join(cursorDir, item.file)
            : path.join(cwd, item.file);
        fs.copyFileSync(item.src, dest);
      }
    };

    if (!ni) {
      const installSpinner = p.spinner();
      installSpinner.start('Installing rules...');
      installRules();
      installSpinner.stop('Installation complete');

      const resultLines = matched
        .map(item => {
          const dest =
            item.target === 'cursor' ? `.cursor/rules/${item.file}` : item.file;
          return `${pc.green('✓')} ${dest}`;
        })
        .join('\n');
      p.note(resultLines, pc.green(`Installed ${matched.length} rule(s)`));

      p.outro(
        `${pc.green('Done!')}  ${pc.dim('Rules installed successfully')}`
      );
    } else {
      installRules();
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
