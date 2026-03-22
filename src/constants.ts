/** Root-level rule file patterns (glob supported) to detect and install to project root */
export const ROOT_RULE_PATTERNS: string[] = [
  'AGENTS.md', // OpenAI Codex, GitHub Copilot, Cursor, Windsurf, Amp, Devin, etc.
  'CLAUDE.md', // Claude Code
  '.cursorrules', // Cursor (legacy)
  '.windsurfrules', // Windsurf / Codeium
  '.clinerules', // Cline
  '.roorules', // Roo Code (legacy)
  '.kilocoderules', // KiloCode (legacy)
  'GEMINI.md' // Gemini / OpenCode
];
