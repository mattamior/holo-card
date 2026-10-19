# Agnir Active Decisions

This file records durable decisions required to operate and evolve this Project safely. Superseded chronology remains available through Git history and `.agnir/evidence/`.

## Continuity identity

- Project identity is `urn:agnir:project:holo-card`; the single logical lineage is `urn:agnir:lineage:authoritative`.
- No VCS selector/binding extension is declared. Every branch checkout resolves the same Project identity and lineage, inheriting the continuity files from `main`; integrations reconcile continuity instead of maintaining per-branch lineages. This fits a project whose branches are simultaneous versions of one codebase, not independent projects.
- `main` remains the authoritative branch for continuity and for the assembled preview site.

## Preservation constraints

- The classic demo stays zero-dependency: no `package.json`, bundler, or runtime library on `main`'s `index.html`. Agnir installation adds documentation and continuity files only.
- Version variants remain isolated on their `feature/*` branches. The build script assembles them at deploy time; version code is not merged into `main` merely to appear on the site.
- Agnir installation must not rewrite unrelated README, project instructions, or Pages configuration.

## Installation provenance

- Installed from published stable release `v1.0.2` of `iorLab/agnir` at immutable revision `b5626394ec40a5cb7a28c01892acde07cc0adc8e`, declared as Core `1.0` / `repository-filesystem/1.0`.
- `AGNIR.md` is the canonical Executor-facing surface; `AGENTS.md` stays locator-only; the README `## Agnir Project Instructions` heading is a backward-compatible locator only.

## Checkpoint and repository operations

- Repository-context `commit` / `提交` / `提交代码` dispatches checkpoint evaluation before commit.
- `commit and push` / `提交推送` adds push plus destination-ref verification.
- Unchanged durable truth is a valid checkpoint no-op; no `.agnir/` mutation is manufactured for commits.
- No Project-defined pre-commit policy (linters, tests, build gates) is declared at install time. The deploy workflow remains the only automated build/verification path.
