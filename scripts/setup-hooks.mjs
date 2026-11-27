// Faz 38 — git kancalarını etkinleştirir: `npm run setup:hooks` (her bilgisayarda BİR kez).
//
// core.hooksPath bu deponun .githooks klasörüne MUTLAK yol olarak yazılır.
// Göreli ".githooks" yazılsaydı git onu her worktree'nin kendi köküne göre
// arardı; Petra worktree'sinde (petra-production soyu) .githooks klasörü
// olmadığı için oradan yapılan push'lar korumasız kalırdı. Mutlak yol
// sayesinde bütün worktree'ler main'deki aynı kancayı çalıştırır.
//
// Yalnız bu deponun yerel git ayarını (.git/config) değiştirir; geri almak:
//   git config --unset core.hooksPath
// postinstall'a bilerek BAĞLANMADI (Vercel derlemesinde ve CI'da çalışmasın).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hooksDir = path.join(repoRoot, ".githooks");

if (!existsSync(path.join(hooksDir, "pre-push"))) {
  console.error(`[setup-hooks] ${hooksDir}/pre-push bulunamadı. Bu komutu main soyundaki çalışma klasöründe çalıştırın.`);
  process.exit(1);
}

const hooksPath = hooksDir.replace(/\\/g, "/");
execFileSync("git", ["config", "core.hooksPath", hooksPath], { cwd: repoRoot, stdio: "inherit" });
console.log(`[setup-hooks] core.hooksPath = ${hooksPath}`);
console.log("[setup-hooks] pre-push koruması etkin (bütün worktree'ler için). Deneme: npm run check:scope -- --range origin/main..HEAD");
