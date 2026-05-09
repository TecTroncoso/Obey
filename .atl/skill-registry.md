# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| creating, opening, or preparing PRs for review | branch-pr | C:\Users\Usuario\.gemini\antigravity\skills\branch-pr\SKILL.md |
| PRs over 400 lines, stacked PRs, review slices | chained-pr | C:\Users\Usuario\.gemini\antigravity\skills\chained-pr\SKILL.md |
| writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs | cognitive-doc-design | C:\Users\Usuario\.gemini\antigravity\skills\cognitive-doc-design\SKILL.md |
| PR feedback, issue replies, reviews, Slack messages, or GitHub comments | comment-writer | C:\Users\Usuario\.gemini\antigravity\skills\comment-writer\SKILL.md |
| Go tests, go test coverage, Bubbletea teatest, golden files | go-testing | C:\Users\Usuario\.gemini\antigravity\skills\go-testing\SKILL.md |
| creating GitHub issues, bug reports, or feature requests | issue-creation | C:\Users\Usuario\.gemini\antigravity\skills\issue-creation\SKILL.md |
| judgment day, dual review, adversarial review, juzgar | judgment-day | C:\Users\Usuario\.gemini\antigravity\skills\judgment-day\SKILL.md |
| new skills, agent instructions, documenting AI usage patterns | skill-creator | C:\Users\Usuario\.gemini\antigravity\skills\skill-creator\SKILL.md |
| implementation, commit splitting, chained PRs, or keeping tests and docs with code | work-unit-commits | C:\Users\Usuario\.gemini\antigravity\skills\work-unit-commits\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue (`Closes #N` in body) and have exactly one `type:*` label.
- Branch names MUST match `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`.
- Commit messages MUST follow Conventional Commits: `type(scope): description`.
- Automated checks (shellcheck, valid type label, approved issue) must pass before merge.
- Do not add `Co-Authored-By` trailers.

### chained-pr
- Split PRs over 400 changed lines unless `size:exception` is explicitly approved.
- Use Stacked PRs for independent slices; Feature Branch Chain (with draft tracker PR) for interdependent ones.
- One deliverable work unit per PR; keep tests and docs with the unit they verify.
- Add Chain Context to PRs (start, end, deps, out-of-scope).
- Retarget/rebase polluted diffs until only the current work unit is shown.

### cognitive-doc-design
- Lead with the answer (decision, action, outcome first).
- Use progressive disclosure: happy path first, then details and edge cases.
- Use chunking and signposting (headings, callouts, lists).
- Prefer tables, checklists, examples, and templates over prose (recognition > recall).
- Write PR descriptions to make the review path explicit and specify out-of-scope items.

### comment-writer
- Start with the actionable point; be useful fast.
- Keep comments short (1-3 paragraphs or tight list) and use warm, direct language.
- Explain the technical reason when requesting a change.
- Comment on high-value issues, avoid pile-ons.
- Match thread language (e.g., voseo in Spanish: podés, tenés).

### go-testing
- Prefer table-driven tests for multiple cases; use `t.Run`.
- Test behavior and state transitions, not implementation trivia.
- Use `t.TempDir()` for files; never rely on real home directories.
- TUI/Bubbletea: test `Model.Update()` directly for state changes; `teatest` for interactive flows.
- Golden files must be deterministic; update via `-update` path only.

### issue-creation
- Always use the Bug Report or Feature Request template; blank issues are blocked.
- Issues receive `status:needs-review` automatically; PRs require `status:approved`.
- Verify no duplicate issues exist and pre-flight checkboxes are marked.
- Questions belong in Discussions, not issues.

### judgment-day
- Launch two blind judges in parallel with identical target and criteria.
- Wait for both judges to finish before synthesis.
- Downgrade theoretical warnings to INFO; real warnings must be triggerable in intended use.
- Ask user before auto-fixing Round 1 confirmed issues.
- After fixing, re-launch both judges in parallel. Re-escalate after 2 iterations if issues remain.

### skill-creator
- Write an LLM-first runtime instruction contract, not a human tutorial.
- Ensure frontmatter has `name`, `description` (YAML-safe, essential trigger words), `license`, `metadata.author/version`.
- Keep the body concise (180–450 tokens, max 1000).
- Put supporting schemas/templates in `assets/` and external docs in `references/`.
- Ensure decision gates provide actionable outcomes based on clear conditions.

### work-unit-commits
- Commit by deliverable behavior, fix, or doc unit, not by file type.
- Keep tests and docs with the unit they verify/explain.
- Ensure the repo works correctly after applying just the commit.
- Use work-unit commits to prepare for chained PRs if changes near 400 lines.
- Base SDD tasks/applies on units that won't bloat single PR reviews.

## Project Conventions

| File | Path | Notes |
|------|------|-------|

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
