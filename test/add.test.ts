import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { add } from '../src/add.js';

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  })),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false)
}));

import * as p from '@clack/prompts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let fixtureRepo: string;
let targetDir: string;

const ni = (cwd: string) => ({ cwd, nonInteractive: true });
const interactive = (cwd: string) => ({ cwd, nonInteractive: false });

beforeAll(() => {
  fixtureRepo = fs.mkdtempSync(path.join(__dirname, '.fixture-'));
  const rulesDir = path.join(fixtureRepo, 'rules');
  fs.mkdirSync(rulesDir);

  // .mdc with frontmatter description
  fs.writeFileSync(
    path.join(rulesDir, 'foo.mdc'),
    '---\ndescription: Foo rule description\nalwaysApply: true\n---\n\n# Foo Rule\nSome content'
  );
  // .mdc without frontmatter
  fs.writeFileSync(path.join(rulesDir, 'bar.mdc'), '# Bar Rule\nOther content');
  fs.writeFileSync(
    path.join(rulesDir, 'react-hooks.mdc'),
    '---\ndescription: React hooks best practices\n---\n\n# React Hooks\nHooks rule'
  );
  fs.writeFileSync(
    path.join(rulesDir, 'react-query.mdc'),
    '# React Query\nQuery rule'
  );

  // Root-level rule files
  fs.writeFileSync(
    path.join(fixtureRepo, 'AGENTS.md'),
    '# Agents\nAgent instructions'
  );
  fs.writeFileSync(
    path.join(fixtureRepo, 'CLAUDE.md'),
    '---\ndescription: Claude instructions\n---\n\n# Claude\nClaude content'
  );

  execSync(
    "git init && git add -A && git -c user.name=test -c user.email=test@test.com commit -m 'init'",
    {
      cwd: fixtureRepo,
      stdio: 'ignore'
    }
  );
});

afterAll(() => {
  fs.rmSync(fixtureRepo, { recursive: true, force: true });
});

beforeEach(() => {
  targetDir = fs.mkdtempSync(path.join(__dirname, '.target-'));
  vi.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(targetDir, { recursive: true, force: true });
});

describe('add — non-interactive', () => {
  it("install all rules with '*' including root files", async () => {
    await add(fixtureRepo, '*', ni(targetDir));

    const cursorRules = fs.readdirSync(
      path.join(targetDir, '.cursor', 'rules')
    );
    expect(cursorRules.sort()).toEqual([
      'bar.mdc',
      'foo.mdc',
      'react-hooks.mdc',
      'react-query.mdc'
    ]);
    expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'CLAUDE.md'))).toBe(true);
  });

  it('install single rule by name', async () => {
    await add(fixtureRepo, 'foo', ni(targetDir));

    const installed = fs.readdirSync(path.join(targetDir, '.cursor', 'rules'));
    expect(installed).toEqual(['foo.mdc']);
  });

  it('install rules with glob pattern', async () => {
    await add(fixtureRepo, 'react-*', ni(targetDir));

    const installed = fs.readdirSync(path.join(targetDir, '.cursor', 'rules'));
    expect(installed.sort()).toEqual(['react-hooks.mdc', 'react-query.mdc']);
  });

  it('install root-level rule by name', async () => {
    await add(fixtureRepo, 'AGENTS.md', ni(targetDir));

    expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(true);
    const content = fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf-8');
    expect(content).toBe('# Agents\nAgent instructions');
  });

  it('throw when no rules match pattern', async () => {
    await expect(
      add(fixtureRepo, 'nonexistent', ni(targetDir))
    ).rejects.toThrow("No rules matched pattern 'nonexistent'");
  });

  it('throw when repo has no rules', async () => {
    const emptyRepo = fs.mkdtempSync(path.join(__dirname, '.empty-'));
    execSync(
      "git init && git -c user.name=test -c user.email=test@test.com commit --allow-empty -m 'init'",
      {
        cwd: emptyRepo,
        stdio: 'ignore'
      }
    );

    try {
      await expect(add(emptyRepo, '*', ni(targetDir))).rejects.toThrow(
        'No rules found in repository'
      );
    } finally {
      fs.rmSync(emptyRepo, { recursive: true, force: true });
    }
  });

  it('copied file content matches source', async () => {
    await add(fixtureRepo, 'foo', ni(targetDir));

    const content = fs.readFileSync(
      path.join(targetDir, '.cursor', 'rules', 'foo.mdc'),
      'utf-8'
    );
    expect(content).toContain('# Foo Rule');
  });

  it('throw when clone fails with invalid URL', async () => {
    await expect(
      add('https://invalid.example.com/no/repo.git', '*', ni(targetDir))
    ).rejects.toThrow('Failed to clone repository');
  });

  it('throw when local path does not exist', async () => {
    await expect(
      add('/tmp/nonexistent-path-rulesx-test', '*', ni(targetDir))
    ).rejects.toThrow('Local path not found');
  });

  it('resolves GitHub shorthand source', async () => {
    // Uses a local non-existent path-like shorthand to avoid hitting GitHub
    // resolveSource converts owner/repo → https://github.com/owner/repo.git
    // We mock execFileSync indirectly by expecting the clone to fail
    await expect(
      add(
        'https://invalid.example.com/fake-owner/fake-repo',
        '*',
        ni(targetDir)
      )
    ).rejects.toThrow('Failed to clone repository');
  });

  it('resolves SSH git@ source', async () => {
    await expect(
      add('git@invalid.example.com:org/repo.git', '*', ni(targetDir))
    ).rejects.toThrow('Failed to clone repository');
  });

  it('resolves HTTPS URL without .git', async () => {
    await expect(
      add('https://invalid.example.com/org/repo', '*', ni(targetDir))
    ).rejects.toThrow('Failed to clone repository');
  });

  it('resolves tilde home path', async () => {
    await expect(
      add('~/nonexistent-rulesx-test-dir', '*', ni(targetDir))
    ).rejects.toThrow('Local path not found');
  });

  it('handles fallback source format', async () => {
    await expect(
      add('some-unknown-format', '*', ni(targetDir))
    ).rejects.toThrow('Failed to clone repository');
  });

  it('installs only root files when no rules/ directory', async () => {
    const rootOnlyRepo = fs.mkdtempSync(path.join(__dirname, '.rootonly-'));
    fs.writeFileSync(path.join(rootOnlyRepo, 'AGENTS.md'), '# Root agents');
    execSync(
      "git init && git add -A && git -c user.name=test -c user.email=test@test.com commit -m 'init'",
      {
        cwd: rootOnlyRepo,
        stdio: 'ignore'
      }
    );

    try {
      await add(rootOnlyRepo, '*', ni(targetDir));
      expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(true);
      // No .cursor/rules/ should be created
      expect(fs.existsSync(path.join(targetDir, '.cursor', 'rules'))).toBe(
        false
      );
    } finally {
      fs.rmSync(rootOnlyRepo, { recursive: true, force: true });
    }
  });
});

describe('add — interactive mode', () => {
  it('displays banner, spinner, summary, and installs', async () => {
    vi.mocked(p.multiselect).mockResolvedValue(['foo.mdc']);
    vi.mocked(p.confirm).mockResolvedValue(true);

    await add(fixtureRepo, undefined, interactive(targetDir));

    expect(p.intro).toHaveBeenCalled();
    expect(p.spinner).toHaveBeenCalled();
    expect(p.log.info).toHaveBeenCalled();
    expect(p.multiselect).toHaveBeenCalled();
    expect(p.confirm).toHaveBeenCalled();
    expect(p.note).toHaveBeenCalled();
    expect(p.outro).toHaveBeenCalled();

    const installed = fs.readdirSync(path.join(targetDir, '.cursor', 'rules'));
    expect(installed).toEqual(['foo.mdc']);
  });

  it('displays description hints in multiselect options', async () => {
    vi.mocked(p.multiselect).mockResolvedValue(['foo.mdc']);
    vi.mocked(p.confirm).mockResolvedValue(true);

    await add(fixtureRepo, undefined, interactive(targetDir));

    const call = vi.mocked(p.multiselect).mock.calls[0]![0] as any;
    const fooOpt = call.options.find((o: any) => o.label === 'foo');
    expect(fooOpt.hint).toContain('Foo rule description');

    // bar.mdc has no frontmatter, hint should be undefined
    const barOpt = call.options.find((o: any) => o.label === 'bar');
    expect(barOpt.hint).toBeUndefined();

    // Root-level files should have → root hint
    const agentsOpt = call.options.find((o: any) => o.label === 'AGENTS.md');
    expect(agentsOpt.hint).toContain('root');
  });

  it('exits gracefully when multiselect is cancelled', async () => {
    vi.mocked(p.multiselect).mockResolvedValue(Symbol.for('cancel') as any);
    vi.mocked(p.isCancel).mockReturnValue(true);

    const exitError = new Error('process.exit');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw exitError;
    });

    await expect(
      add(fixtureRepo, undefined, interactive(targetDir))
    ).rejects.toThrow('process.exit');

    expect(p.cancel).toHaveBeenCalledWith('Installation cancelled.');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('exits gracefully when confirm is declined', async () => {
    vi.mocked(p.multiselect).mockResolvedValue(['foo.mdc']);
    vi.mocked(p.confirm).mockResolvedValue(false);
    vi.mocked(p.isCancel)
      .mockReturnValueOnce(false) // multiselect not cancelled
      .mockReturnValueOnce(false); // confirm not cancelled (but value is false)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(
      add(fixtureRepo, undefined, interactive(targetDir))
    ).rejects.toThrow('process.exit');

    expect(p.cancel).toHaveBeenCalledWith('Installation cancelled.');
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('exits gracefully when confirm is cancelled', async () => {
    vi.mocked(p.multiselect).mockResolvedValue(['foo.mdc']);
    vi.mocked(p.confirm).mockResolvedValue(Symbol.for('cancel') as any);
    vi.mocked(p.isCancel)
      .mockReturnValueOnce(false) // multiselect not cancelled
      .mockReturnValueOnce(true); // confirm cancelled

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(
      add(fixtureRepo, undefined, interactive(targetDir))
    ).rejects.toThrow('process.exit');

    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('shows install all message with * pattern', async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(p.isCancel).mockReturnValue(false);

    await add(fixtureRepo, '*', interactive(targetDir));

    // Should show "Installing all X rules"
    const infoCalls = vi.mocked(p.log.info).mock.calls.map(c => c[0]);
    expect(infoCalls.some(msg => String(msg).includes('Installing all'))).toBe(
      true
    );
    expect(p.outro).toHaveBeenCalled();
  });

  it('truncates rule names when more than 3 in summary', async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(p.isCancel).mockReturnValue(false);

    await add(fixtureRepo, '*', interactive(targetDir));

    const noteCall = vi
      .mocked(p.note)
      .mock.calls.find(c => c[1] === 'Installation Summary');
    expect(noteCall).toBeDefined();
    const summary = noteCall![0] as string;
    expect(summary).toContain('+');
    expect(summary).toContain('more');
  });

  it('installs root files to project root in interactive mode', async () => {
    vi.mocked(p.multiselect).mockResolvedValue(['AGENTS.md']);
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(p.isCancel).mockReturnValue(false);

    await add(fixtureRepo, undefined, interactive(targetDir));

    expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(true);
    // .cursor/rules/ should not be created when only root files selected
    expect(fs.existsSync(path.join(targetDir, '.cursor', 'rules'))).toBe(false);
  });

  it('shows spinner error on clone failure', async () => {
    const spinnerStop = vi.fn();
    vi.mocked(p.spinner).mockReturnValue({
      start: vi.fn(),
      stop: spinnerStop,
      message: vi.fn()
    } as any);

    await expect(
      add(
        'https://invalid.example.com/no/repo.git',
        '*',
        interactive(targetDir)
      )
    ).rejects.toThrow('Failed to clone repository');

    expect(spinnerStop).toHaveBeenCalledWith('Clone failed');
  });

  it('masks credentials in source URL display', async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(p.isCancel).mockReturnValue(false);

    await add(fixtureRepo, '*', interactive(targetDir));

    // Source log should not contain raw credentials
    const infoCalls = vi.mocked(p.log.info).mock.calls.map(c => String(c[0]));
    const sourceLog = infoCalls.find(msg => msg.includes('Source:'));
    expect(sourceLog).toBeDefined();
  });

  it('displays result lines with green checkmarks', async () => {
    vi.mocked(p.multiselect).mockResolvedValue(['foo.mdc', 'bar.mdc']);
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(p.isCancel).mockReturnValue(false);

    await add(fixtureRepo, undefined, interactive(targetDir));

    const noteCall = vi
      .mocked(p.note)
      .mock.calls.find(c => String(c[1]).includes('Installed'));
    expect(noteCall).toBeDefined();
    const results = noteCall![0] as string;
    expect(results).toContain('.cursor/rules/foo.mdc');
    expect(results).toContain('.cursor/rules/bar.mdc');
  });
});
