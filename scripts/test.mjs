import { spawnSync } from "node:child_process";
const commands = [];
if (process.argv.includes("--all"))
  commands.push(
    ["node", ["node_modules/typescript/bin/tsc", "--noEmit"]],
    ["node", ["node_modules/eslint/bin/eslint.js", "."]],
  );
commands.push(["node", ["node_modules/vitest/vitest.mjs", "run"]]);
if (process.argv.includes("--all"))
  commands.push([
    "node",
    [
      "node_modules/vite/bin/vite.js",
      "build",
      ...process.argv
        .slice(2)
        .filter((a) => a.startsWith("--base=") || a.startsWith("--outDir=")),
    ],
  ]);
if (process.argv.includes("--browser"))
  commands.push([
    "node",
    [
      "scripts/browser-check.mjs",
      ...process.argv
        .slice(2)
        .filter((a) => a.startsWith("--url=") || a.startsWith("--dist=")),
    ],
  ]);
for (const [cmd, args] of commands) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status || 1);
}
