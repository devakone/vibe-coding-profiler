import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim().replace(/^export\s+/, "");
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && (process.env[key] === undefined || process.env[key] === "")) {
      process.env[key] = value;
    }
  }
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnvFile(path.join(repoRoot, "apps/web/.env.local"));
loadDotEnvFile(path.join(repoRoot, "apps/web/.env"));
loadDotEnvFile(path.join(repoRoot, ".env.local"));
loadDotEnvFile(path.join(repoRoot, ".env"));

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/supabase.mjs <supabase args>");
  process.exit(2);
}

const child = spawn("npx", ["supabase", ...args], {
  stdio: "inherit",
  env: process.env,
  cwd: repoRoot,
});

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", () => process.exit(1));
