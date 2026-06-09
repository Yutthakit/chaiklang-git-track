/**
 * gittrack.ts — pure core for the Git Work Tracker.
 *
 * "เพราะเรามี Git เราจะ track ความสามารถของการทำงานได้" — git history IS the
 * record of work. This module turns raw `git log` text into a story:
 *   - when each file was created (first time git saw it)
 *   - which files were deleted, and how many
 *   - how much each file changed (churn)
 *
 * No shell, no fs — just (git output text) → (structured report). The dispatcher
 * (cli.ts) runs git; this stays pure so it's testable on canned output. (WS1
 * lesson again: pure core, thin edge.)
 */

export type Status = "A" | "M" | "D";

export interface FileEvent {
  hash: string;
  date: string;   // YYYY-MM-DD
  author: string;
  status: Status;
  path: string;
}

export interface Churn {
  added: number;    // lines inserted (lifetime)
  deleted: number;  // lines removed (lifetime)
}

export interface FileLife {
  path: string;
  created: string;        // earliest date seen as Added
  lastTouched: string;    // latest date of any event
  commits: number;        // commits touching this file
  present: boolean;       // still in the tree (last event was not a delete)
  deletedOn?: string;     // date of the delete that removed it (if absent now)
  churn: Churn;
}

/** One day on the work timeline — the proof that work happened, and what changed. */
export interface TimelinePoint {
  date: string;
  commits: number;
  added: string[];
  deleted: string[];
  modified: number;
}

export interface Report {
  files: FileLife[];
  createdCount: number;
  deletedCount: number;          // files no longer present
  deletedFiles: FileLife[];
  presentCount: number;
  totalCommits: number;          // distinct commits seen
  timeline: TimelinePoint[];     // chronological proof, oldest → newest
}

/**
 * Parse `git log --date=short --pretty=tformat:'§%H\t%ad\t%an' --name-status --no-renames`.
 * Commit lines start with "§"; file lines are "<A|M|D>\t<path>".
 */
export function parseNameStatus(output: string): FileEvent[] {
  const events: FileEvent[] = [];
  let hash = "", date = "", author = "";
  for (const raw of output.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.startsWith("§")) {
      [hash, date, author] = line.slice(1).split("\t");
      continue;
    }
    const m = line.match(/^([AMD])\t(.+)$/);
    if (m && hash) {
      events.push({ hash, date, author, status: m[1] as Status, path: m[2].trim() });
    }
  }
  return events;
}

/** Parse `git log --numstat --pretty=tformat:'§%H'` → lifetime churn per path. */
export function parseNumstat(output: string): Map<string, Churn> {
  const churn = new Map<string, Churn>();
  for (const raw of output.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.startsWith("§") || !line.trim()) continue;
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!m) continue;
    const added = m[1] === "-" ? 0 : parseInt(m[1], 10);
    const deleted = m[2] === "-" ? 0 : parseInt(m[2], 10);
    const path = m[3].trim();
    const c = churn.get(path) ?? { added: 0, deleted: 0 };
    c.added += added;
    c.deleted += deleted;
    churn.set(path, c);
  }
  return churn;
}

/** Combine events (any order) + churn into a per-file lifecycle report. */
export function summarize(events: FileEvent[], churn?: Map<string, Churn>): Report {
  const byPath = new Map<string, FileEvent[]>();
  const commits = new Set<string>();
  for (const e of events) {
    commits.add(e.hash);
    const arr = byPath.get(e.path) ?? [];
    arr.push(e);
    byPath.set(e.path, arr);
  }

  const files: FileLife[] = [];
  for (const [path, evs] of byPath) {
    const sorted = [...evs].sort((a, b) => a.date.localeCompare(b.date));
    const adds = sorted.filter((e) => e.status === "A");
    const created = (adds[0] ?? sorted[0]).date;
    const last = sorted[sorted.length - 1];
    const present = last.status !== "D";
    files.push({
      path,
      created,
      lastTouched: last.date,
      commits: new Set(evs.map((e) => e.hash)).size,
      present,
      deletedOn: present ? undefined : last.date,
      churn: churn?.get(path) ?? { added: 0, deleted: 0 },
    });
  }

  files.sort((a, b) => a.created.localeCompare(b.created) || a.path.localeCompare(b.path));
  const deletedFiles = files.filter((f) => !f.present);

  // build the timeline: group every event by date (the proof of work over time)
  const byDate = new Map<string, { commits: Set<string>; added: string[]; deleted: string[]; modified: number }>();
  for (const e of events) {
    const slot = byDate.get(e.date) ?? { commits: new Set<string>(), added: [], deleted: [], modified: 0 };
    slot.commits.add(e.hash);
    if (e.status === "A") slot.added.push(e.path);
    else if (e.status === "D") slot.deleted.push(e.path);
    else slot.modified++;
    byDate.set(e.date, slot);
  }
  const timeline: TimelinePoint[] = [...byDate.entries()]
    .map(([date, s]) => ({ date, commits: s.commits.size, added: s.added, deleted: s.deleted, modified: s.modified }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    files,
    createdCount: files.length,
    deletedCount: deletedFiles.length,
    deletedFiles,
    presentCount: files.filter((f) => f.present).length,
    totalCommits: commits.size,
    timeline,
  };
}

/** Render a human-readable work-tracker report (bilingual, like a git skill). */
export function formatReport(report: Report, repoLabel = "."): string {
  const churnOf = (f: FileLife) => f.churn.added + f.churn.deleted;
  const topChanged = [...report.files].sort((a, b) => churnOf(b) - churnOf(a)).slice(0, 8);

  const out: string[] = [];
  out.push(`📊 Git Work Tracker — ${repoLabel}`);
  out.push("");

  // 🕒 TIMELINE — the proof, oldest → newest
  out.push("🕒 Timeline (proof of work):");
  for (const t of report.timeline) {
    const bits = [`+${t.added.length}`, `−${t.deleted.length}`, `~${t.modified}`].join(" ");
    out.push(`     ${t.date}  ${bits}  (${t.commits} commits)` +
      (t.added.length ? `\n        + ${t.added.slice(0, 6).join(", ")}${t.added.length > 6 ? " …" : ""}` : "") +
      (t.deleted.length ? `\n        − ${t.deleted.slice(0, 6).join(", ")}${t.deleted.length > 6 ? " …" : ""}` : ""));
  }
  out.push("");

  out.push(`สรุป (across ${report.totalCommits} commits):`);
  out.push(`  • ไฟล์ที่เคยถูกสร้าง (created)  : ${report.createdCount}`);
  out.push(`  • ไฟล์ที่ยังอยู่ (present)       : ${report.presentCount}`);
  out.push(`  • ไฟล์ที่ถูกลบไปแล้ว (deleted)  : ${report.deletedCount}`);
  out.push("");

  if (report.deletedFiles.length) {
    out.push(`🗑️  ลบออกไป ${report.deletedCount} ไฟล์:`);
    for (const f of report.deletedFiles.slice(0, 12)) {
      out.push(`     − ${f.path}  (สร้าง ${f.created} → ลบ ${f.deletedOn})`);
    }
    if (report.deletedFiles.length > 12) out.push(`     … +${report.deletedFiles.length - 12} more`);
    out.push("");
  }

  out.push("🔧 เปลี่ยนเยอะสุด (by churn):");
  for (const f of topChanged) {
    const flag = f.present ? "" : " (ลบแล้ว)";
    out.push(`     ${f.path}${flag}  +${f.churn.added}/−${f.churn.deleted}  ·  ${f.commits} commits  ·  เกิด ${f.created}`);
  }
  return out.join("\n");
}
