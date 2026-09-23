import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const catalog = JSON.parse(read("_authoring/catalog.json"));
const originalEvidence = JSON.parse(read("_authoring/legacy-evidence-baseline.json"));
const pilots = [
  "builds/harkster",
  "builds/mp3-home-player",
  "builds/systematic-trading-strategy",
  "startups/hedgd-limited",
  "ideas/api-of-you",
  "ideas/point-of-sale-betting-terminals",
];
const expected = new Set(pilots);
const failures = [];
const facts = {
  "builds/harkster": [
    "2023", "Harkster Limited", "institutional research platform", "existing research feeds",
    "real-time Harkster Kernel", "proprietary AI assistants", "alpha discovery", "internal systems",
    "bespoke AI assistants and agents", "client workflows", "consensus signals", "hidden trade ideas",
    "market-moving events", "Clean Architecture", "distributed systems", "actor-based architecture",
    "RESTful APIs", "Marketing website", "single-page application", "REST API server",
    "Model Context Protocol (MCP) server", ".NET Orleans silo", "Microsoft Azure", "ASP.NET Core Web API",
    "Razor Pages", "Vue.js", "Tailwind CSS", "Azure Cosmos DB", "Azure SQL Database",
    "Azure SignalR Service", "Azure Storage", "Microsoft Entra ID", "Microsoft Graph",
    "Azure Front Door", "T-SQL",
  ],
  "builds/mp3-home-player": [
    "2001", "University Project", "stereo system", "WAV, MIDI and MP3", "internal storage",
    "standard playback controls", "menu-driven interface", "remote operation", "library management",
    "MP3 transfer across a network", "self-contained home music system", "Client–server architecture",
    "Physical media-player product", "Windows desktop application", "server-side software",
    "On-premises infrastructure", "CGI", "FreeBSD", "Visual Basic",
  ],
  "builds/systematic-trading-strategy": [
    "2011", "BTG Pactual", "multi-portfolio, multi-asset", "back-testing and approval",
    "across portfolios and asset classes", "co-designed and back-tested", "Excel, VBA and C#",
    "automation infrastructure", "April 2011 to May 2012", "returned 10%",
    "significant market uncertainty", "key portfolio manager departed",
    "Desktop and command-line processing solution", "Microsoft Excel workbook",
    ".NET command-line application", "On-premises user desktops", "ADO.NET", "Sophis API",
    "bespoke file-based database",
  ],
  "startups/hedgd-limited": [
    "2016–2023", "Co-founded", "London", "multi-asset order management", "trading workflow",
    "notifications", "internal knowledge sharing", "operational friction", "trading instructions",
    "execution workflow", "notification overload", "team communication", "allocation, charge and FIX engines",
    "Order Chat", "FinTiq", "MicroReports", "led product and technology direction",
    "2016 to 2023", "Azure-hosted web applications", "supporting backend services", "ASP.NET Core",
    "Razor Pages", "Vue", "SQL", "SignalR", "storage", "service bus patterns",
    "native iOS capability",
  ],
  "ideas/api-of-you": [
    "2012", "ownership, control and value", "identity, content and digital records",
    "belonged first to the individual", "consent, portability and value", "keep private",
    "what to share", "benefit from access to their personal information",
  ],
  "ideas/point-of-sale-betting-terminals": [
    "2003", "self-service betting exchange", "public venues", "pubs and social spaces",
    "venue experience", "review available markets", "venue-based transaction",
    "Department for Culture, Media and Sport", "their strong advice",
  ],
};

function textOf(html) {
  return html.replace(/<[^>]+>/g, " ")
    .replace(/&(?:ndash|mdash);/g, "–").replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&").replace(/&(?:rsquo|lsquo);/g, "'")
    .replace(/\s+/g, " ").trim().toLowerCase();
}

function attributes(html, tag, attribute) {
  const values = [];
  for (const match of html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))) {
    const value = match[0].match(new RegExp(`\\b${attribute}="([^"]+)"`))?.[1];
    if (value) values.push(value);
  }
  return values;
}

let editorialCount = 0;
let legacyCount = 0;
for (const id of catalog.pages.filter((value) => /^(?:builds|startups|ideas)\//.test(value))) {
  const page = JSON.parse(read(`_authoring/pages/${id}/page.json`));
  const isPilot = expected.has(id);
  if (page.rendering !== (isPilot ? "editorial" : "legacy")) failures.push(`${id}: unexpected rendering mode`);
  if (page.rendering === "editorial") editorialCount += 1;
  else if (page.rendering === "legacy") legacyCount += 1;
  if (!isPilot) continue;

  const evidence = originalEvidence[id];
  if (!evidence) {
    failures.push(`${id}: original evidence baseline is missing`);
    continue;
  }
  const html = read(page.output);
  const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? "";
  if (!main.includes('class="page-shell editorial-detail')) failures.push(`${id}: editorial layout is missing`);
  if (page.output !== `${id}/index.html` || page.path !== `/${id}/`) failures.push(`${id}: route changed`);
  const currentImages = attributes(main, "img", "src").sort();
  if (JSON.stringify(evidence.imageSources) !== JSON.stringify(currentImages)) failures.push(`${id}: original media was lost or changed`);
  const currentImageDescriptions = attributes(main, "img", "alt").sort();
  if (JSON.stringify(evidence.imageDescriptions) !== JSON.stringify(currentImageDescriptions)) failures.push(`${id}: original image descriptions were lost or changed`);
  for (const link of evidence.links) {
    if (!attributes(main, "a", "href").includes(link)) failures.push(`${id}: original link ${link} was lost`);
  }
  for (const anchor of evidence.anchors) {
    if (!main.includes(`id="${anchor}"`)) failures.push(`${id}: original anchor ${anchor} was lost`);
  }
  const body = textOf(main);
  for (const fact of facts[id]) {
    if (!body.includes(fact.toLowerCase())) failures.push(`${id}: missing documented evidence: ${fact}`);
  }
  const firstSection = main.indexOf('class="editorial-detail__section"');
  if (firstSection < 0 || (main.includes("<img ") && main.indexOf("<img ") < firstSection)) {
    failures.push(`${id}: large media appears before the opening narrative`);
  }
}
if (editorialCount !== 6 || legacyCount !== 40) failures.push(`Expected six editorial and 40 legacy details; found ${editorialCount} and ${legacyCount}`);

const harkster = textOf(read("builds/harkster/index.html"));
const mp3 = textOf(read("builds/mp3-home-player/index.html"));
const strategy = textOf(read("builds/systematic-trading-strategy/index.html"));
const hedgd = textOf(read("startups/hedgd-limited/index.html"));
const api = textOf(read("ideas/api-of-you/index.html"));
const betting = textOf(read("ideas/point-of-sale-betting-terminals/index.html"));
if (!harkster.includes("don't think we've proved product-market fit") || harkster.includes("found product-market fit")) {
  failures.push("Harkster's product-market-fit uncertainty is missing");
}
if (!mp3.includes("serial connection") || /rs[ -]?(?:232|323)/i.test(mp3)) {
  failures.push("MP3 Home Player asserts an unverified serial-interface standard");
}
if (!strategy.includes("the strategy operated from april 2011 to may 2012 and returned 10% during significant market uncertainty before being discontinued after a key portfolio manager departed")) {
  failures.push("Systematic Trading Strategy's documented result or stopping reason changed");
}
if (!hedgd.includes("came to a natural conclusion") || !hedgd.includes("we had a go") || /successful exit|commercial failure|product collapsed/.test(hedgd)) {
  failures.push("HEDGD's ending or founder perspective is misstated");
}
if (!api.includes("api of you remained a concept") || /never built|abandoned company/.test(api)) {
  failures.push("API of You's confirmed concept-only status is missing or overstated");
}
if (!betting.includes("they didn't give me a detailed regulatory argument") || !betting.includes("i don't know whether that was their concern")
  || !betting.includes("i chose not to pursue it")) {
  failures.push("The Department discussion is no longer appropriately qualified");
}

const localNotes = join(root, ".local-editorial", "notes.json");
if (existsSync(localNotes)) {
  const notes = JSON.parse(readFileSync(localNotes, "utf8"));
  for (const issue of notes.factualAudit ?? []) {
    if (expected.has(issue.item) && issue.status === "needs Matt review") failures.push(`${issue.item}: unresolved factual-audit issue blocks editorial migration`);
  }
}
for (const id of catalog.pages) {
  const page = JSON.parse(read(`_authoring/pages/${id}/page.json`));
  if (/TODO\(Matt\)|EDITORIAL_TODO|FACTUAL_AUDIT|needs Matt review|\.local-editorial/i.test(read(page.output))) {
    failures.push(`${id}: private editorial material leaked into public output`);
  }
}

if (failures.length) {
  console.error(`Gate D validation failed with ${failures.length} issue(s):\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Gate D validation passed: exactly six editorial pilots and 40 legacy details.");
  console.log("Original media, links, anchors and selected factual evidence are preserved; no private editorial material was published.");
}
