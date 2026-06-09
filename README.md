# 📊 ChaiKlang Git-Track — git history as a timeline of work

> Oracle School · Quiz 2026-06-09 · **Git Work Tracker** · by ChaiKlang Oracle (ชายกลาง) for BM/Yutthakit

*"เพราะเรามี Git เราจะ track ความสามารถของการทำงานได้"* — because we have Git, the
history **is** the record of work. This is a Maw Engine command that turns
`git log` into a story:

- 🕒 a **timeline** (proof of work, day by day)
- 🌱 when each file was **created**
- 🗑️ which files were **deleted**, and **how many**
- 🔧 how each file **changed** (churn)

Built as a **maw plugin** — P'Nat's rule: *a command lives in the Maw Engine.*

## Run (in the engine)

```bash
ln -sfn "$PWD" ~/.maw/plugins/chaiklang-track   # install
maw chaiklang-track <repo>          # full report
maw chaiklang-track <repo> --json   # machine-readable
```

> Command is namespaced `chaiklang-track` (not a bare `gittrack`) so it never
> collides with another oracle's tracker in a shared `~/.maw/plugins`.

## Real output (`Soul-Brews-Studio/voice-bot`)

```
📊 Git Work Tracker — .../voice-bot

🕒 Timeline (proof of work):
     2026-05-22  +55 −0 ~0  (1 commits)
        + .env.example, .gitignore, DEMO-SCRIPT.md, LICENSE, README.md …
     2026-05-23  +27 −26 ~32  (10 commits)
        + src/stt/typhoon.ts, src/tools/context.ts …
        − src/audio-pipeline.ts, src/brain.ts, src/commands.ts …
     2026-06-05  +3 −0 ~6  (1 commits)
        + bin/think-responder.ts, test/think-responder.test.ts

สรุป (across 28 commits):
  • ไฟล์ที่เคยถูกสร้าง (created)  : 84
  • ไฟล์ที่ยังอยู่ (present)       : 58
  • ไฟล์ที่ถูกลบไปแล้ว (deleted)  : 26

🗑️  ลบออกไป 26 ไฟล์:
     − src/audio-pipeline.ts  (สร้าง 2026-05-22 → ลบ 2026-05-23)
     ...
🔧 เปลี่ยนเยอะสุด (by churn): ...
```

(The 2026-05-23 "great refactor" — 27 added, 26 deleted in one day — is exactly
the kind of work-pattern the timeline makes visible.)

## How it works

| Piece | Role |
|---|---|
| `gittrack.ts` | **pure core** — `git log` text → timeline + per-file lifecycle. No shell, no fs. |
| `index.ts` | **maw verb** — thin dispatcher: runs git, hands text to the core, prints. |
| `gittrack.test.ts` | **9 tests** — parsing, creation-date, deletion, churn, timeline. |

Two git reads: `--name-status` (A/M/D lifecycle) and `--numstat` (line churn),
both with `--date=short`. Renames are counted as delete+add (`--no-renames`) so
"added / deleted" stay honest.

## Built like the WS2 git-skill

This follows the workshop where we made a skill to *explain* git — see
[`SKILL.md`](./SKILL.md). It teaches the three git verbs that answer "what
happened here": `log --name-status`, `log --numstat`, `--diff-filter`.

```bash
bun test   # 9 pass
```

🍺 *Every commit is a small proof you did the work. This just reads them back to you.*
