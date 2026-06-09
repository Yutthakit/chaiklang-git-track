/**
 * maw chaiklang-git-track — the Git Work Tracker, as a Maw Engine plugin.
 *
 * P'Nat's rule: a command lives in the Maw Engine. So the deliverable is a maw
 * plugin verb, not a loose script.
 *
 *   maw chaiklang-track [repo]          full report (timeline + summary + changes)
 *   maw chaiklang-track [repo] --json   machine-readable report
 *
 * (namespaced as chaiklang-track to avoid colliding with other oracles'
 *  gittrack commands in a shared ~/.maw/plugins — thanks Vessel + ViaLumen.)
 *
 * Thin dispatcher: it only shells out to git and hands the text to the pure
 * core in gittrack.ts (which is unit-tested).
 */
import type { InvokeContext, InvokeResult } from "maw-js/plugin/types";
import { spawnSync } from "child_process";
import { parseNameStatus, parseNumstat, summarize, formatReport } from "./gittrack";

export const command = {
  name: "chaiklang-track",
  description: "Git Work Tracker — timeline + created/deleted/changed files (proof of work).",
};

function git(repo: string, args: string[]): string {
  const r = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr?.trim() || `git ${args[0]} failed`);
  return r.stdout;
}

export function trackRepo(repo: string) {
  const nameStatus = git(repo, [
    "log", "--all", "--date=short", "--no-renames",
    "--pretty=tformat:§%H\t%ad\t%an", "--name-status",
  ]);
  const numstat = git(repo, ["log", "--all", "--pretty=tformat:§%H", "--numstat"]);
  return summarize(parseNameStatus(nameStatus), parseNumstat(numstat));
}

export default async function handler(ctx: InvokeContext): Promise<InvokeResult> {
  const out: string[] = [];
  const log = (s: string) => (ctx.writer ? ctx.writer(s) : out.push(s));
  const done = (ok: boolean): InvokeResult => ({
    ok, output: ctx.writer ? "" : out.join("\n"), error: ok ? undefined : "", exitCode: ok ? 0 : 1,
  });

  const args = (ctx.args as string[]) ?? [];
  if (args[0] === "--help" || args[0] === "-h") {
    log("maw chaiklang-track [repo] [--json]  — git history as a timeline of work (created/deleted/changed)");
    return done(true);
  }
  const json = args.includes("--json");
  const repo = args.find((a) => !a.startsWith("-")) ?? ".";

  try {
    const report = trackRepo(repo);
    if (json) log(JSON.stringify(report, null, 2));
    else log(formatReport(report, repo));
    return done(true);
  } catch (e) {
    log(`✗ ${(e as Error).message}  (is '${repo}' a git repo?)`);
    return done(false);
  }
}
