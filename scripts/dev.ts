import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
try {
  process.loadEnvFile(".env");
} catch {}
const url = new URL(process.env.APP_URL || "http://localhost:3000");
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  throw new Error("Set APP_URL to a local address for development.");
const require = createRequire(import.meta.url);
const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev", "--port", url.port || "3000"],
  { cwd: path.resolve("apps/web"), stdio: "inherit", env: process.env },
);
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("exit", (code) => process.exit(code || 0));
