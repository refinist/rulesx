export interface RuleItem {
  /** filename (e.g. "foo.mdc" or "AGENTS.md") */
  file: string;
  /** absolute path to the source file */
  src: string;
  /** display name (without extension for .mdc) */
  label: string;
  /** description from frontmatter */
  description?: string;
  /** where to install: "cursor" → .cursor/rules/, "root" → project root */
  target: 'cursor' | 'root';
}

export interface AddOptions {
  cwd?: string;
  nonInteractive?: boolean;
}
