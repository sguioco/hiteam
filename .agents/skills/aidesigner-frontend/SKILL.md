# AIDesigner Frontend

Use this skill when the user explicitly wants AIDesigner for frontend generation or redesign.

Operating rules:
- Spend AIDesigner credits only when the user explicitly asked to use AIDesigner or clearly opted into that workflow.
- Before generating anything, inspect repo design context first:
  - `DESIGN.md`, `.aidesigner/DESIGN.md`, or `docs/design.md` if present
  - theme files, tokens, fonts, shared components, CSS variables, Tailwind config
  - the target route/page and nearby components
- Prefer the connected `aidesigner` MCP server for:
  - `whoami`
  - `get_credit_status`
  - `generate_design`
  - `refine_design`
- For v1 MCP usage, keep calls prompt-driven. Do not pass `mode` or `url` unless the user explicitly asked for a reference URL workflow and the MCP surface supports it.

Prompting rules:
- Write an internal design brief before spending credits:
  - target platform and surface
  - product goal and main user action
  - current visual language to preserve or intentionally replace
  - repo constraints and important existing patterns
  - explicit user constraints and must-haves
- Convert the user ask into a broad visual reference prompt.
- Let AIDesigner invent layout, composition, and visual rhythm.
- Do not over-spec exact sections, button labels, copy blocks, or card counts unless the user explicitly requested them.
- If the repo already has a strong design system, bias toward it and mention concrete tokens/fonts only when helpful.

Artifact workflow:
- After successful MCP generation or refinement, persist the result locally in `.aidesigner/`.
- Use:
  - `pnpm dlx @aidesigner/agent-skills capture ...`
  - `pnpm dlx @aidesigner/agent-skills preview --id <run-id>`
  - `pnpm dlx @aidesigner/agent-skills adopt --id <run-id>`
- Treat generated HTML as a design artifact first and implementation input second.
- Rebuild the final result with repo-native components and styles instead of pasting raw standalone HTML into the app.

Fallbacks:
- If MCP auth is missing, authenticate from the Codex/Cursor MCP panel or run:
  - `codex mcp login aidesigner`
- If MCP is unavailable but `AIDESIGNER_API_KEY` is configured, use the CLI fallback:
  - `pnpm dlx @aidesigner/agent-skills generate --prompt "..."`
  - `pnpm dlx @aidesigner/agent-skills refine --id <run-id> --prompt "..."`
