import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const home = read("index.html");
const journey = read("journey/index.html");
const workbenchPage = read("workbench/index.html");
const baseline = JSON.parse(read("_authoring/baseline.json"));
const workbench = JSON.parse(read("_authoring/workbench.json"));
const notes = JSON.parse(read("_authoring/notes.json"));
const sitemap = read("sitemap.xml");
const failures = [];

const selectedWork = [
  "builds/harkster", "builds/systematic-trading-strategy",
  "builds/equity-research-platform-for-hedge-funds", "startups/hedgd-limited",
  "builds/mp3-home-player", "builds/car-motorcycle-manager",
];
const selectedWorkNames = [
  "Harkster", "Systematic Trading Strategy", "Equity Research Platform",
  "HEDGD", "MP3 Home Player", "Car &amp; Motorcycle Manager",
];
const selectedIdeas = ["ideas/api-of-you", "ideas/postbox", "ideas/non-slip-burger-buns"];
const section = (html, id) => html.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?<\\/section>`))?.[0] ?? "";
const idsIn = (html) => [...html.matchAll(/data-content-id="([^"]+)"/g)].map((match) => match[1]);

for (const [id, expected] of [["builds", selectedWork], ["ideas", selectedIdeas]]) {
  const html = section(home, id);
  if (JSON.stringify(idsIn(html)) !== JSON.stringify(expected)) failures.push(`Home ${id}: selected records differ from the approved list`);
  for (const recordId of expected) {
    const page = JSON.parse(read(`_authoring/pages/${recordId}/page.json`));
    if (!html.includes(`href="${recordId}/"`) || !existsSync(join(root, page.output))) failures.push(`${recordId}: selected link is broken`);
    if (!html.includes(page.listing.summary.replaceAll("&", "&amp;"))) failures.push(`${recordId}: source summary is missing`);
  }
}
const selectedWorkLabels = [...section(home, "builds").matchAll(/<strong>([^<]+)<\/strong>/g)].map((match) => match[1]);
if (JSON.stringify(selectedWorkLabels) !== JSON.stringify(selectedWorkNames)) failures.push("Home selected work names or order differ from the approved list");
if (idsIn(home).length !== 9 || home.includes('class="index-row"')) failures.push("Home still contains a full catalogue or extra historical selection");
for (const fragment of ["builds", "startups", "ideas", "contact"]) {
  if (!home.includes(`id="${fragment}"`)) failures.push(`Home #${fragment} compatibility anchor is missing`);
}
if (!home.includes('id="startups" data-content-id="startups/hedgd-limited"')) failures.push("#startups no longer points to the selected startup");
if (home.includes("world-map.svg") || home.includes('class="global-footprint"')) failures.push("Home still contains the global map");
if (!home.includes("I've been building things with software since 1996.") || home.includes('class="hero-signals"')) failures.push("Home hero positioning has regressed");
if (!home.includes("I still design them, write the code and enjoy finding problems worth building around.")) failures.push("Home hero supporting copy has regressed");
if (!home.includes("Current projects, experiments, unresolved ideas and things I've decided not to pursue.")) failures.push("Home Workbench introduction has regressed");
if (!section(home, "ideas").includes('class="home-v2-ideas"') || section(home, "ideas").includes('class="home-v2-list"')) failures.push("Selected ideas lost their editorial text-block treatment");
if (!home.includes("Teams across 31 offices in 18 countries") || !home.includes("Budgets managed for global operations")
  || !home.includes("SaaS + AI") || !home.includes("Full-stack software in financial services")) failures.push("Career evidence changed meaning");
if (!home.includes('href="workbench/"') || !home.includes('href="archive/"') || !home.includes('href="contact/"')) failures.push("Home editorial routes are missing");

const journeyIds = new Set([...journey.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
for (const id of baseline.pages["journey/index.html"].ids) {
  if (!journeyIds.has(id)) failures.push(`Journey lost original anchor ${id}`);
}
const chapters = [...journey.matchAll(/<section class="journey-chapter[^\"]*" id="([^"]+)"/g)].map((match) => match[1]);
if (chapters.length !== 8 || chapters.filter((id) => id === "chapter-open").length !== 1) failures.push("Journey must have exactly eight chapters including Chapter 08");
if (!journey.includes('href="#chapter-open"') || !journey.includes('Chapter 08 — ?') || !journey.includes('<time datetime="2025">2025</time>–present')) failures.push("Chapter 08 navigation or date is missing");
if (!journey.includes('journey-chapter--current journey-chapter--open" id="chapter-open"') || journey.includes('journey-chapter--current" id="chapter-ai"')) failures.push("The unfinished present is assigned to the wrong chapter");
const mapPosition = journey.indexOf("world-map.svg");
if (mapPosition < journey.indexOf('id="chapter-scale"') || mapPosition > journey.indexOf('id="chapter-market"')) failures.push("The map is not in the operational-scale chapter");
if (!journey.includes('class="journey-map"') || !journey.includes("A broader view of places where I worked across roles and years")) failures.push("The map lacks career-wide context");
if (!journey.includes("This chapter isn't finished.") || !journey.includes('href="../workbench/"')) failures.push("Journey no longer ends at the unfinished present and Workbench");
const confirmedWorkbench = [
  ["alphacapture", "AlphaCapture", "building"],
  ["one-pound-experiment", "£1 Experiment", "building"],
  ["till", "TILL", "exploring"],
  ["professional-memory", "Professional Memory", "exploring"],
  ["hop", "Hop", "shelved"],
];
if (workbench.reviewedAt !== "2026-09-23"
  || !workbenchPage.includes('Last reviewed <time datetime="2026-09-23">23 Sep 2026</time>')) {
  failures.push("Workbench review date differs from the confirmed human review date");
}
if (JSON.stringify(workbench.entries.map(({ id, name, status }) => [id, name, status])) !== JSON.stringify(confirmedWorkbench)
  || JSON.stringify(workbench.entries.map(({ sortOrder }) => sortOrder)) !== JSON.stringify([10, 20, 10, 20, 10])
  || workbench.entries.some((entry) => !entry.visible || entry.url || entry.relatedIds.length
    || entry.startedAt || entry.updatedAt || entry.shelvedAt)) {
  failures.push("Workbench entries, status order, or manually confirmed fields differ from the approved set");
}
if (workbench.entries.find((entry) => entry.id === "hop")?.shelvedReason
  !== "Interesting mechanic; distribution and verification looked harder than the value it created.") {
  failures.push("Hop's confirmed shelving reason changed");
}
if ((workbenchPage.match(/class="workbench-entry"/g) ?? []).length !== 5
  || !workbenchPage.includes('<h2 id="workbench-building">Building</h2>')
  || !workbenchPage.includes('<h2 id="workbench-exploring">Exploring</h2>')
  || !workbenchPage.includes('<h2 id="workbench-shelved">Shelved</h2>')
  || workbenchPage.includes('id="workbench-thinking"')) {
  failures.push("Workbench does not render two Building, two Exploring and one Shelved entry with Thinking empty");
}
const homeWorkbench = home.match(/<section class="home-v2-section home-v2-workbench"[\s\S]*?<\/section>/)?.[0] ?? "";
const previewIds = [...homeWorkbench.matchAll(/data-workbench-id="([^"]+)"/g)].map((match) => match[1]);
if (JSON.stringify(previewIds) !== JSON.stringify(["alphacapture", "one-pound-experiment", "till"])
  || !homeWorkbench.includes("<h3>Building</h3>") || !homeWorkbench.includes("<h3>Exploring</h3>")
  || !homeWorkbench.includes("£1 Experiment") || home.includes("My Dream, My Wish")
  || !homeWorkbench.includes("See the Workbench")
  || home.includes("Professional Memory") || home.includes("Hop")) {
  failures.push("Home Workbench preview differs from the approved three entries");
}
if (notes.notes.some((note) => note.status === "published")) failures.push("A Note was published during Gate C");
if (sitemap.includes("https://mttcnnng.com/notes/")) failures.push("Empty Notes appears in the sitemap");
for (const name of ["index.html", "journey/index.html", "archive/index.html", "workbench/index.html", "notes/index.html", "contact/index.html", "404.html"]) {
  if (/TODO\(Matt\)|EDITORIAL_TODO|FACTUAL_AUDIT|\.local-editorial|needs Matt review/i.test(read(name))) failures.push(`${name}: private editorial material leaked`);
}

if (failures.length) {
  console.error(`Gate C validation failed with ${failures.length} issue(s):\n${failures.map((issue) => `- ${issue}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Gate C validation passed: 6 selected works in the requested order, 3 selected ideas, 8 Journey chapters.");
  console.log("Legacy fragments, Journey anchors, populated Workbench, empty Notes, and editorial privacy checks passed.");
}
