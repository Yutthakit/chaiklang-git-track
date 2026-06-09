---
name: git-track
description: Read a repo's git history as a timeline of work — when files were created, which were deleted (and how many), and how each changed. Use when asked "what happened in this repo", "track the work", "what got deleted", or for a proof-of-work timeline.
---

# git-track — git history as proof of work

Git already records everything. This skill reads it back as a **timeline +
summary + changes** (the three things every report should have).

## The three git questions, and the command that answers each

| Question | Git command |
|---|---|
| **When was a file born / killed?** | `git log --all --diff-filter=A -- <path>` (born), `--diff-filter=D` (killed) |
| **Who changed, how much?** (churn) | `git log --numstat` → `<added>\t<deleted>\t<path>` per file |
| **What is the lifecycle of every file?** | `git log --all --name-status` → `A/M/D\t<path>` per commit |

## The recipe this tool uses

```bash
# 1) lifecycle: every Add / Modify / Delete, with date + commit
git log --all --date=short --no-renames \
  --pretty=tformat:'§%H\t%ad\t%an' --name-status

# 2) churn: lines added/removed per file
git log --all --pretty=tformat:'§%H' --numstat
```

Then, in pure code:
1. group events **by date** → the timeline (proof).
2. per file: earliest `A` = created; if the latest event is `D` it's currently
   deleted (count those); sum numstat = churn.
3. render: 🕒 timeline → 📋 summary → 🔧 changes.

## Gotchas

- **Renames** look like delete+add unless you track `R###`. We pass
  `--no-renames` so "deleted count" isn't inflated by moves — state the choice.
- **Re-added files**: a file can be A → D → A. "created" = the *first* A;
  "present" = whether the *last* event was not a D.
- `--all` includes every branch; drop it to track only the current branch.

## Use it

```bash
maw gittrack <repo>          # in the Maw Engine
maw gittrack <repo> --json   # for piping
```
