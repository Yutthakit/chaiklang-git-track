import { expect, test, describe } from "bun:test";
import { parseNameStatus, parseNumstat, summarize, formatReport } from "./gittrack";

// canned `git log --name-status` output (newest first, as git emits)
const LOG = [
  "§c3\t2026-06-09\tNat",
  "D\tdraft.md",          // draft.md deleted on 06-09
  "M\tcli.ts",
  "",
  "§c2\t2026-06-08\tNat",
  "A\tcli.ts",            // cli.ts added 06-08
  "M\tREADME.md",
  "",
  "§c1\t2026-06-07\tBM",
  "A\tREADME.md",         // README created 06-07
  "A\tdraft.md",          // draft.md created 06-07 (later deleted)
].join("\n");

const NUMSTAT = [
  "§c3",
  "0\t40\tdraft.md",
  "5\t2\tcli.ts",
  "§c2",
  "30\t0\tcli.ts",
  "3\t1\tREADME.md",
  "§c1",
  "20\t0\tREADME.md",
  "40\t0\tdraft.md",
].join("\n");

describe("parseNameStatus", () => {
  test("extracts events with commit context", () => {
    const ev = parseNameStatus(LOG);
    expect(ev).toHaveLength(6); // c3:2 + c2:2 + c1:2
    expect(ev[0]).toEqual({ hash: "c3", date: "2026-06-09", author: "Nat", status: "D", path: "draft.md" });
  });
  test("ignores stray lines without a commit header", () => {
    expect(parseNameStatus("A\torphan.txt")).toHaveLength(0);
  });
});

describe("summarize", () => {
  const report = summarize(parseNameStatus(LOG), parseNumstat(NUMSTAT));

  test("counts created / present / deleted", () => {
    expect(report.createdCount).toBe(3);    // README, cli.ts, draft.md
    expect(report.presentCount).toBe(2);    // README, cli.ts
    expect(report.deletedCount).toBe(1);    // draft.md
  });

  test("creation date = earliest Add, not latest event", () => {
    const readme = report.files.find((f) => f.path === "README.md")!;
    expect(readme.created).toBe("2026-06-07");
    expect(readme.commits).toBe(2);
    expect(readme.present).toBe(true);
  });

  test("deleted file knows when it was created and removed", () => {
    const d = report.deletedFiles[0];
    expect(d.path).toBe("draft.md");
    expect(d.created).toBe("2026-06-07");
    expect(d.deletedOn).toBe("2026-06-09");
    expect(d.present).toBe(false);
  });

  test("churn is summed over the file's lifetime", () => {
    const cli = report.files.find((f) => f.path === "cli.ts")!;
    expect(cli.churn).toEqual({ added: 35, deleted: 2 }); // 30+5 / 0+2
  });
});

describe("timeline (proof)", () => {
  const report = summarize(parseNameStatus(LOG), parseNumstat(NUMSTAT));
  test("is chronological oldest → newest", () => {
    expect(report.timeline.map((t) => t.date)).toEqual(["2026-06-07", "2026-06-08", "2026-06-09"]);
  });
  test("captures adds/deletes per day", () => {
    const first = report.timeline[0];
    expect(first.added.sort()).toEqual(["README.md", "draft.md"]);
    const last = report.timeline[2];
    expect(last.deleted).toEqual(["draft.md"]);
  });
});

describe("formatReport", () => {
  test("renders counts and the deleted section", () => {
    const out = formatReport(summarize(parseNameStatus(LOG), parseNumstat(NUMSTAT)), "demo");
    expect(out).toContain("ถูกลบไปแล้ว (deleted)  : 1");
    expect(out).toContain("draft.md");
    expect(out).toContain("Git Work Tracker — demo");
  });
});
