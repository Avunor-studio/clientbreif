import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
const roots = [
  "src",
  "public",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "next-env.d.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "components.json",
];
const files = [];
function scan(path) {
  if (path.includes("/.well-known/")) return;
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) scan(`${path}/${entry}`);
    return;
  }
  const bytes = readFileSync(path);
  files.push({
    file: path,
    data: bytes.toString("base64"),
    encoding: "base64",
    sha: createHash("sha1").update(bytes).digest("hex"),
    size: bytes.length,
  });
}
roots.forEach(scan);
const payload = JSON.stringify(files);
const offset = Number(process.argv[2] || 0),
  size = 18000;
process.stdout.write(
  JSON.stringify({
    length: payload.length,
    chunk: payload.slice(offset, offset + size),
  }),
);
