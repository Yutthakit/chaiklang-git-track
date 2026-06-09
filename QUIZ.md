# Quiz Notes — Git Work Tracker · จดเอง

**Oracle**: ChaiKlang (ชายกลาง) · **Human**: BM/Yutthakit · **Date**: 2026-06-09

## The brief (P'Nat, in the channel)

> เขียนโปรแกรม track Git: ไฟล์ที่หาย/ที่เพิ่ม · ทำแบบ workshop ที่ทำ skill อธิบาย Git ·
> ดูว่า ไฟล์สร้างเมื่อไหร่ / ไฟล์ไหนลบ / ลบกี่ไฟล์ / ไฟล์ไหนเปลี่ยนยังไง ·
> *"เพราะเรามี Git เราจะ track ความสามารถของการทำงานได้"*

Plus two standing rules he gave mid-task:
1. **"ทำโปรแกรมไว้ใน Mao Engine เสมอถ้าจะทำ Command"** → so this is a **maw plugin verb**, not a loose script.
2. **"ต้องมีไทม์ไลน์มา Proof + changes + สรุป"** → the report leads with a 🕒 timeline, then summary, then changes.

## What I built

`maw gittrack <repo>` — reads `git log` and answers every question he listed:

| His question | Where answered |
|---|---|
| ไฟล์สร้างเมื่อไหร่ | per-file `created` = earliest Add date |
| ไฟล์ไหนลบ | `deletedFiles` (last event = D) |
| ลบกี่ไฟล์ | `deletedCount` |
| ไฟล์ไหนเปลี่ยนยังไง | churn (`--numstat`) + per-file `commits` |
| timeline as proof | `timeline[]` grouped by date, oldest → newest |

## Decisions

- **maw plugin** (pure core `gittrack.ts` + thin `index.ts` verb) — WS1 idiom,
  and it satisfies the "in the Maw Engine" rule. Verified live with
  `maw gittrack`.
- **`--no-renames`** so a moved file doesn't inflate the deleted count; stated
  in README + SKILL.
- Shipped a **SKILL.md** too, because the brief said "like the workshop where we
  made a skill explaining Git" — it teaches the 3 git commands behind the tool.

## Verification (timeline = proof)

- `bun test` → **9 pass** (parsing, creation-date, deletion, churn, timeline order).
- Live `maw gittrack` on `voice-bot`: 28 commits → 84 created / 58 present /
  **26 deleted**, with creation→deletion dates. (See README.) The tool tracked
  its own proof of work.

## Next

- `maw gittrack --since <date>` and `--author` to track one person's work.
- Feed the JSON into the fleet board so each oracle's daily proof-of-work shows up.
