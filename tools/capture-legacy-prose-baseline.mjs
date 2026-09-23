// Run only when intentionally accepting a new historical-text baseline.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { legacyProseDigest } from "./legacy-prose.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(root, "_authoring/catalog.json"), "utf8"));
const baseline = {};
for (const id of catalog.pages.filter((value) => /^(?:builds|ideas|startups)\//.test(value))) {
  const directory = join(root, "_authoring/pages", id);
  const metadata = JSON.parse(readFileSync(join(directory, "page.json"), "utf8"));
  if (metadata.rendering !== "legacy") continue;
  baseline[id] = legacyProseDigest(readFileSync(join(directory, "content.html"), "utf8"));
}
if (Object.keys(baseline).length !== 40) throw new Error("Expected exactly 40 legacy pages");
writeFileSync(join(root, "_authoring/legacy-prose-baseline.json"), `${JSON.stringify(baseline, null, 2)}\n`);
console.log("Captured the historical introduction and narrative on 40 legacy pages.");
