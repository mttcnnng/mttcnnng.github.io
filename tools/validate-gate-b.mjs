import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { legacyProseDigest } from "./legacy-prose.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const authoring = join(root, "_authoring");
const catalog = JSON.parse(readFileSync(join(authoring, "catalog.json"), "utf8"));
const baseline = JSON.parse(readFileSync(join(authoring, "baseline.json"), "utf8"));
const legacyProseBaseline = JSON.parse(readFileSync(join(authoring, "legacy-prose-baseline.json"), "utf8"));
const notes = JSON.parse(readFileSync(join(authoring, "notes.json"), "utf8"));
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const failures = [];

const read = (name) => readFileSync(join(root, name), "utf8");
const plain = (value) => value.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "’").replace(/&lsquo;/g, "‘")
  .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”").replace(/&amp;/g, "&")
  .replace(/&#39;/g, "'").replace(/&middot;/g, "·").replace(/\s+/g, " ").trim();
const paths = new Set();
const ids = new Set();
const records = { builds: [], startups: [], ideas: [] };

for (const id of catalog.pages) {
  const page = JSON.parse(readFileSync(join(authoring, "pages", id, "page.json"), "utf8"));
  if (ids.has(id) || paths.has(page.path)) failures.push(`Duplicate content ID or route: ${id}`);
  ids.add(id);
  paths.add(page.path);
  const category = id.split("/")[0];
  if (Object.hasOwn(records, category)) records[category].push(page);
  const expectedFile = id === "home" ? "index.html" : `${id}/index.html`;
  if (page.output !== expectedFile || !existsSync(join(root, expectedFile))) failures.push(`${id}: original route is missing or changed`);
}

for (const [category, count] of Object.entries({ builds: 26, startups: 5, ideas: 15 })) {
  if (records[category].length !== count) failures.push(`${category}: expected ${count} records, found ${records[category].length}`);
}

const categories = { all: Object.values(records).flat(), ...records };
for (const [category, expected] of Object.entries(categories)) {
  const file = category === "all" ? "archive/index.html" : `archive/${category}/index.html`;
  const html = read(file);
  const rows = [...html.matchAll(/<li class="archive-row">\s*<a href="([^"]+)">\s*<span class="archive-row__meta"><span>([^<]+)<\/span><span>([^<]+)<\/span>/g)]
    .map((match) => ({ href: `/${match[1].replace(/^(?:\.\.\/)+/, "")}`, date: match[2], type: match[3] }));
  const hrefs = rows.map((row) => row.href);
  if (hrefs.length !== expected.length || new Set(hrefs).size !== expected.length) failures.push(`${file}: incorrect row count or duplicate route`);
  const expectedPaths = new Set(expected.map((page) => page.path));
  for (const href of hrefs) if (!expectedPaths.has(href)) failures.push(`${file}: unexpected detail route ${href}`);
  for (const page of expected) {
    if (!hrefs.includes(page.path)) failures.push(`${file}: missing ${page.path}`);
    if (!existsSync(join(root, page.output))) failures.push(`${file}: broken detail route ${page.path}`);
    const row = rows.find((item) => item.href === page.path);
    if (row && (row.date !== (page.archive.dateLabel ?? "Date not recorded") || row.type !== page.kind)) {
      failures.push(`${file}: incorrect recorded date or type for ${page.id}`);
    }
  }
  const years = rows.filter((row) => row.date !== "Date not recorded")
    .map((row) => Number(row.date.slice(0, 4)));
  if (years.some((year, index) => index > 0 && year > years[index - 1])) failures.push(`${file}: chronology is not newest first`);
  if (expected.some((page) => page.archive.sortYear === null) && !html.includes('<section class="archive-group" aria-label="Date not recorded">')) {
    failures.push(`${file}: missing undated section`);
  }
}

const undated = Object.values(records).flat().filter((page) => page.archive.sortYear === null);
if (undated.length !== 1 || undated[0].id !== "ideas/syscretionary-com" || undated[0].archive.dateLabel !== null) {
  failures.push("The original undated idea must remain undated");
}
for (const page of Object.values(records).flat()) {
  const html = read(page.output);
  const category = `${page.kind}s`;
  if (!html.includes(`class="back-link" href="../../archive/${category}/"`)) failures.push(`${page.id}: back-link does not reach its Archive category`);
}

const editorialOutputs = new Set(Object.values(records).flat().filter((page) => page.rendering === "editorial").map((page) => page.output));
for (const page of Object.values(records).flat().filter((item) => item.rendering === "legacy")) {
  if (legacyProseDigest(read(page.output)) !== legacyProseBaseline[page.id]) failures.push(`${page.id}: historical introduction or narrative changed`);
}
for (const [file, before] of Object.entries(baseline.pages)) {
  if (file === "index.html" || file === "journey/index.html" || editorialOutputs.has(file)) continue;
  const html = read(file);
  const idsNow = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const headingsNow = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)]
    .map((match) => ({ level: Number(match[1]), text: plain(match[2]) }));
  const expectedHeadings = file === "ideas/non-slip-burger-buns/index.html"
    ? before.headings.map((heading) => heading.text === "App poster" ? { ...heading, text: "Concept poster" } : heading)
    : before.headings;
  const imagesNow = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map((match) => match[1]);
  if (JSON.stringify(idsNow) !== JSON.stringify(before.ids)) failures.push(`${file}: baseline anchors changed`);
  if (JSON.stringify(headingsNow) !== JSON.stringify(expectedHeadings)) failures.push(`${file}: baseline headings changed`);
  if (JSON.stringify(imagesNow) !== JSON.stringify(before.images)) failures.push(`${file}: baseline media changed`);
}

const home = read("index.html");
if (!home.includes('id="contact"') || !home.includes('id="builds"') || !home.includes('id="startups"') || !home.includes('id="ideas"')) {
  failures.push("Homepage legacy fragments no longer resolve");
}
const published = notes.notes.filter((note) => note.status === "published");
if (!published.length) {
  for (const file of ["index.html", "journey/index.html", "archive/index.html", "workbench/index.html"]) {
    if (/<nav class="site-nav"[\s\S]*?<\/nav>/.exec(read(file))?.[0].includes(">Notes<")) failures.push(`${file}: Notes is visible before publication`);
  }
  if (sitemap.includes("https://mttcnnng.com/notes/")) failures.push("Empty Notes appears in sitemap");
}
for (const note of notes.notes.filter((item) => item.status === "draft")) {
  if (existsSync(join(root, "notes", note.id, "index.html")) || sitemap.includes(`https://mttcnnng.com/notes/${note.id}/`)) failures.push(`${note.id}: draft Note leaked`);
}
for (const route of ["/archive/", "/archive/builds/", "/archive/startups/", "/archive/ideas/", "/workbench/", "/contact/"]) {
  if (!sitemap.includes(`<loc>https://mttcnnng.com${route}</loc>`)) failures.push(`${route}: absent from sitemap`);
}
if (sitemap.includes("/404.html")) failures.push("404 must not appear in sitemap");
const contact = read("contact/index.html");
if (/mailto:|@/.test(contact.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "")) failures.push("Contact invents an email destination");
const notFound = read("404.html");
if (!notFound.includes('name="robots" content="noindex"') || !notFound.includes('href="/archive/"')
  || !notFound.includes('href="/assets/css/styles.css"')) failures.push("404 page is incomplete");

if (failures.length) {
  console.error(`Gate B validation failed with ${failures.length} issue(s):\n${failures.map((issue) => `- ${issue}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Gate B validation passed: 46 Archive records (26 builds, 5 startups, 15 ideas).");
  console.log("Legacy detail prose, anchors, headings and media are preserved; historical routes, new routes, sitemap, Notes, Contact and 404 checks passed.");
}
