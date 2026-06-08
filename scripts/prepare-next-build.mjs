import { rmSync } from "node:fs";
import { resolve, sep } from "node:path";

const workspace = resolve(process.cwd());

for (const relativePath of [
  ".next/types",
  ".next/dev/types",
  ".next-demo/types",
  ".next-demo/dev/types",
]) {
  const target = resolve(workspace, relativePath);
  if (!target.startsWith(`${workspace}${sep}`)) {
    throw new Error(`Refusing to clean generated types outside the workspace: ${target}`);
  }
  rmSync(target, { recursive: true, force: true });
}
