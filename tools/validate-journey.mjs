import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = readFileSync(join(root, "index.html"), "utf8");
const journey = readFileSync(join(root, "journey", "index.html"), "utf8");
const contentHrefPattern = /href="((?:builds|startups|ideas)\/[^"#?]+\/)"/g;
const journeyEntryPattern = /data-entry-id="((?:builds|startups|ideas)\/[^"]+)"[\s\S]*?href="\.\.\/((?:builds|startups|ideas)\/[^"#?]+\/)"/g;

const expected = [...home.matchAll(contentHrefPattern)].map((match) => match[1]);
const entries = [...journey.matchAll(journeyEntryPattern)].map((match) => ({
  id: `${match[1]}/`,
  href: match[2],
}));
const failures = [];

if (expected.length !== 46) {
  failures.push(`Expected 46 homepage entries, found ${expected.length}.`);
}

const expectedSet = new Set(expected);
const represented = entries.map((entry) => entry.href);
const representedSet = new Set(represented);

for (const href of expectedSet) {
  const count = represented.filter((candidate) => candidate === href).length;
  if (count !== 1) {
    failures.push(`${href} is represented ${count} times; expected exactly once.`);
  }

  if (!existsSync(join(root, href, "index.html"))) {
    failures.push(`${href} does not resolve to a local index.html file.`);
  }
}

for (const entry of entries) {
  if (entry.id !== entry.href) {
    failures.push(`Entry id ${entry.id} does not match href ${entry.href}.`);
  }
  if (!expectedSet.has(entry.href)) {
    failures.push(`${entry.href} appears on Journey but not on the homepage.`);
  }
}

if (entries.length !== representedSet.size) {
  failures.push("Journey contains duplicate data-entry-id or primary entry links.");
}

const counts = { builds: 0, startups: 0, ideas: 0 };
for (const href of representedSet) {
  const type = href.split("/")[0];
  if (type in counts) counts[type] += 1;
}

const expectedCounts = { builds: 26, startups: 5, ideas: 15 };
for (const [type, count] of Object.entries(expectedCounts)) {
  if (counts[type] !== count) {
    failures.push(`Expected ${count} ${type}, found ${counts[type]}.`);
  }
}

const ids = [...journey.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) {
  failures.push(`Duplicate HTML ids: ${[...new Set(duplicateIds)].join(", ")}.`);
}

const pageLinks = [...journey.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((match) => match[1]);
for (const href of pageLinks) {
  if (href.startsWith("#")) {
    if (!ids.includes(href.slice(1))) failures.push(`In-page link ${href} has no matching id.`);
    continue;
  }

  if (/^(?:https?:|mailto:|tel:)/.test(href)) continue;

  const path = href.split(/[?#]/, 1)[0];
  const target = resolve(root, "journey", path);
  const file = path.endsWith("/") || path === "." ? join(target, "index.html") : target;
  if (!existsSync(file)) failures.push(`Local Journey link ${href} does not resolve.`);
}

if (failures.length) {
  console.error("Journey validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Journey validation passed.");
  console.log(`Entries: ${entries.length} (${counts.builds} builds, ${counts.startups} startups, ${counts.ideas} ideas)`);
  console.log("All homepage entries appear exactly once and resolve to local detail pages.");
}
