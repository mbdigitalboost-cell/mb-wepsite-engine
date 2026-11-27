// Faz 38 — PUSH KORUMASI. İki kullanım:
//
// 1) git pre-push kancası (.githooks/pre-push bunu çağırır; git, push edilen
//    her dal için stdin'e "<yerel ref> <yerel sha> <uzak ref> <uzak sha>" yazar):
//      node scripts/check-branch-scope.mjs <remote adı> <remote url>
//
// 2) Elle, push'tan ÖNCE rapor (SITE_IZOLASYON.md §4):
//      npm run check:scope -- --branch main --range origin/main..HEAD
//    Sahiplik özetini yazar ve aynı kuralları uygular.
//
// Kurallar: lib/sites/branch-scope.ts (bir commit iki siteye dokunamaz; Petra
// dalına yalnız Petra dosyası; main soyuna Petra dosyası giremez). İhlalde
// çıkış 1 → push durur. Kancayı `--no-verify` ile atlamak kullanıcı açıkça
// istemedikçe YASAKTIR.
//
// Betik kendi konumundaki sahiplik haritasını kullanır; bu sayede Petra
// worktree'sinden (dalında bu dosyalar olmayan) yapılan push'lar da denetlenir.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { evaluatePush, isolatedSiteForBranch, ownershipSummary } from "../lib/sites/branch-scope.ts";
import { SHARED_BRANCH } from "../lib/sites/registry.ts";

const ZERO = /^0+$/;

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function refExists(ref) {
  return git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { allowFailure: true }) !== null;
}

function isAncestor(sha, ref) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sha, ref], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function commitInfo(sha, sharedRefs, checkLineage) {
  const message = git(["log", "-1", "--format=%B", sha]) ?? "";
  const files = (git(["show", "--pretty=format:", "--name-only", "--diff-merges=first-parent", "-z", sha]) ?? "").split("\0").filter(Boolean);
  return {
    sha,
    subject: message.split("\n")[0] ?? "",
    message,
    files,
    onSharedLineage: checkLineage && sharedRefs.some((ref) => isAncestor(sha, ref)),
  };
}

function commitsOf(revListArgs) {
  return (git(["rev-list", "--reverse", ...revListArgs]) ?? "").split("\n").filter(Boolean);
}

function check(branch, shas, remote) {
  const sharedRefs = [`refs/remotes/${remote}/${SHARED_BRANCH}`, `refs/heads/${SHARED_BRANCH}`].filter(refExists);
  const checkLineage = isolatedSiteForBranch(branch) !== null;
  const commits = shas.map((sha) => commitInfo(sha, sharedRefs, checkLineage));
  return { commits, result: evaluatePush(branch, commits) };
}

function printResult(branch, commits, result) {
  for (const warning of result.warnings) console.warn(`[push-koruması] UYARI — ${warning}`);
  if (result.errors.length > 0) {
    console.error(`[push-koruması] HATA — "${branch}" dalına push durduruldu (SITE_IZOLASYON.md §2):`);
    for (const error of result.errors) console.error(`  - ${error}`);
    console.error("  Sahiplik haritası: lib/sites/ownership.ts. Kanca --no-verify ile atlanmaz; kural yanlışsa kullanıcıya sorun.");
    return false;
  }
  console.log(`[push-koruması] temiz — "${branch}": ${commits.length} commit denetlendi.`);
  return true;
}

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

// ---- 2) elle rapor ----
if (args.includes("--range")) {
  const range = option("--range");
  const branch = option("--branch") ?? (git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "").trim();
  const remote = option("--remote") ?? "origin";
  const shas = commitsOf([range]);
  const { commits, result } = check(branch, shas, remote);
  const files = [...new Set(commits.flatMap((commit) => commit.files))];
  console.log(`[push-koruması] dal "${branch}", aralık ${range}: ${commits.length} commit, ${files.length} dosya`);
  for (const [owner, owned] of [...ownershipSummary(files).entries()].sort()) {
    console.log(`  ${owner}: ${owned.length} dosya`);
    if (args.includes("--files")) for (const file of owned.sort()) console.log(`      ${file}`);
  }
  process.exit(printResult(branch, commits, result) ? 0 : 1);
}

// ---- 1) pre-push kancası ----
const remote = args[0] ?? "origin";
const input = readFileSync(0, "utf8");
let ok = true;
for (const line of input.split("\n")) {
  const [localRef, localSha, remoteRef, remoteSha] = line.trim().split(/\s+/);
  if (!localRef || !remoteRef) continue;
  if (ZERO.test(localSha)) continue; // dal silme
  if (!remoteRef.startsWith("refs/heads/")) continue; // etiket vb.
  const branch = remoteRef.slice("refs/heads/".length);
  // Yeni dal: uzakta hiçbir dalda olmayan commit'ler. Var olan dal: uzak uç..yerel uç.
  const shas = ZERO.test(remoteSha) ? commitsOf([localSha, "--not", `--remotes=${remote}`]) : commitsOf([`${remoteSha}..${localSha}`]);
  const { commits, result } = check(branch, shas, remote);
  if (!printResult(branch, commits, result)) ok = false;
}
process.exit(ok ? 0 : 1);
