import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
let current: string;
try {
  current = await readFile(".env", "utf8");
} catch {
  current = await readFile(".env.example", "utf8");
}
if (!/^OPS_TOKEN=.+$/m.test(current)) {
  current = current.replace(
    /^OPS_TOKEN=.*$/m,
    "OPS_TOKEN=" + randomBytes(32).toString("hex"),
  );
  await writeFile(".env", current);
  console.log(
    "Local setup ready. Operations credential saved in ignored .env. Restart the development server.",
  );
} else console.log("Existing local configuration preserved.");
