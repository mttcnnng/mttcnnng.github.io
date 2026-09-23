import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPage } from "../_authoring/templates/site.mjs";
import { loadGateB } from "./gate-b.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const authoring = join(root, "_authoring");
const localEditorial = join(root, ".local-editorial");
const catalogFile = join(authoring, "catalog.json");
const baselineFile = join(authoring, "baseline.json");
const privateMarker = /TODO\(Matt\)|EDITORIAL_TODO|FACTUAL_AUDIT/i;

function fail(message) {
  throw new Error(message);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

function json(path) {
  return JSON.parse(read(path));
}

function jsonWrite(path, value) {
  write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function slash(path) {
  return path.split(sep).join("/");
}

function filesBelow(directory, predicate) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(path, predicate);
    return predicate(path) ? [path] : [];
  }).sort();
}

function publicPages() {
  return filesBelow(root, (path) => path.endsWith(`${sep}index.html`) || path === join(root, "index.html"));
}

function route(relativePath) {
  return relativePath === "index.html" ? "/" : `/${relativePath.replace(/index\.html$/, "")}`;
}

function headTemplateName(kind) {
  return ["build", "startup", "idea"].includes(kind) ? "detail" : kind;
}

function sliceRequired(source, start, end, label) {
  if (start < 0 || end < start) fail(`Could not extract ${label}`);
  return source.slice(start, end);
}

function extractHead(source, path) {
  let template = source;
  const head = {};
  const fields = [
    ["description", /(<meta\b[^>]*\bname="description"[^>]*\bcontent=")([^"]*)(")/],
    ["canonical", /(<link\b[^>]*\brel="canonical"[^>]*\bhref=")([^"]*)(")/],
    ["ogTitle", /(<meta\b[^>]*\bproperty="og:title"[^>]*\bcontent=")([^"]*)(")/],
    ["ogDescription", /(<meta\b[^>]*\bproperty="og:description"[^>]*\bcontent=")([^"]*)(")/],
    ["ogUrl", /(<meta\b[^>]*\bproperty="og:url"[^>]*\bcontent=")([^"]*)(")/],
    ["ogImage", /(<meta\b[^>]*\bproperty="og:image"[^>]*\bcontent=")([^"]*)(")/],
    ["ogImageAlt", /(<meta\b[^>]*\bproperty="og:image:alt"[^>]*\bcontent=")([^"]*)(")/],
    ["twitterCard", /(<meta\b[^>]*\bname="twitter:card"[^>]*\bcontent=")([^"]*)(")/],
    ["twitterTitle", /(<meta\b[^>]*\bname="twitter:title"[^>]*\bcontent=")([^"]*)(")/],
    ["twitterDescription", /(<meta\b[^>]*\bname="twitter:description"[^>]*\bcontent=")([^"]*)(")/],
    ["twitterImage", /(<meta\b[^>]*\bname="twitter:image"[^>]*\bcontent=")([^"]*)(")/],
    ["title", /(<title>)([^<]*)(<\/title>)/],
  ];

  for (const [key, expression] of fields) {
    const match = template.match(expression);
    if (!match) fail(`${path}: missing ${key} in head`);
    head[key] = match[2];
    template = template.replace(expression, `$1{{${key}}}$3`);
  }

  return { template, head };
}

function plainText(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "’").replace(/&lsquo;/g, "‘")
    .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”").replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'").replace(/&middot;/g, "·").replace(/\s+/g, " ").trim();
}

function homeListings(home) {
  const listings = new Map();
  const pattern = /<a class="index-row" href="((?:builds|startups|ideas)\/[^"#?]+\/)"[\s\S]*?<\/a>/g;
  for (const match of home.matchAll(pattern)) {
    const fragment = match[0];
    const title = fragment.match(/<span class="index-row__title">([\s\S]*?)<\/span>/)?.[1];
    const summary = fragment.match(/<span class="index-row__desc">([\s\S]*?)<\/span>/)?.[1];
    const badge = fragment.match(/<span class="icon-tile">([\s\S]*?)<\/span>/)?.[1];
    if (!title || !summary || !badge) fail(`Incomplete homepage listing for ${match[1]}`);
    listings.set(match[1].slice(0, -1), {
      title: plainText(title),
      summary: plainText(summary),
      dateLabel: plainText(badge),
    });
  }
  if (listings.size !== 46) fail(`Expected 46 homepage listings, found ${listings.size}`);
  return listings;
}

function extractPage(source, relativePath, listings) {
  const headOpen = source.indexOf("  <head>");
  const headStart = headOpen + "  <head>".length;
  const headClose = source.indexOf("  </head>", headStart);
  const headerStart = source.indexOf('    <header class="site-header"', headClose);
  const headerEnd = source.indexOf("    </header>", headerStart) + "    </header>".length;
  const mainStart = source.indexOf("    <main ", headerEnd);
  const mainEnd = source.lastIndexOf("    </main>") + "    </main>".length;
  const footerStart = source.indexOf('    <footer class="site-footer', mainEnd);
  const footerEnd = source.indexOf("    </footer>", footerStart) + "    </footer>".length;
  if ([headOpen, headClose, headerStart, mainStart, footerStart].some((index) => index < 0)) {
    fail(`${relativePath}: missing document boundary`);
  }
  const { template, head } = extractHead(sliceRequired(source, headStart, headClose, "head"), relativePath);
  const main = sliceRequired(source, mainStart, mainEnd, "main");
  const category = relativePath.split("/")[0];
  const kind = relativePath === "index.html" ? "home" : relativePath === "journey/index.html" ? "journey"
    : category === "domains-for-sale" ? "domains" : category.slice(0, -1);
  const id = relativePath === "index.html" ? "home" : relativePath.replace(/\/index\.html$/, "");
  const depth = relativePath.split("/").length - 1;
  const page = {
    id,
    path: route(relativePath),
    output: relativePath,
    kind,
    root: depth === 0 ? "" : "../".repeat(depth),
    rendering: "legacy",
    title: plainText(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ""),
    listing: listings.get(id) ?? null,
    head,
    newline: source.includes("\r\n") ? "crlf" : "lf",
    layout: {
      prefix: source.slice(0, headStart),
      beforeHeader: source.slice(headClose, headerStart),
      betweenHeaderAndMain: source.slice(headerEnd, mainStart),
      betweenMainAndFooter: source.slice(mainEnd, footerStart),
      suffix: source.slice(footerEnd),
    },
  };
  if (["build", "startup", "idea"].includes(kind) && !page.listing) fail(`${id}: missing listing`);
  return { page, headTemplate: template, main };
}

function baselineEntry(bytes) {
  const source = bytes.toString("utf8");
  return {
    sha256: hash(bytes),
    ids: [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
    headings: [...source.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)]
      .map((match) => ({ level: Number(match[1]), text: plainText(match[2]) })),
    images: [...source.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map((match) => match[1]),
    links: [...source.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]),
  };
}

function importLegacy() {
  if (existsSync(catalogFile) || existsSync(baselineFile)) fail("Authoring data already exists; import is a one-time migration command.");
  const paths = publicPages();
  if (paths.length !== 49) fail(`Expected 49 source pages, found ${paths.length}`);
  const listings = homeListings(read(join(root, "index.html")));
  const baseline = { version: 1, pages: {}, assets: {} };
  const catalog = [];
  const headTemplates = new Map();

  for (const path of paths) {
    const name = slash(relative(root, path));
    const bytes = readFileSync(path);
    const { page, headTemplate, main } = extractPage(bytes.toString("utf8"), name, listings);
    const directory = join(authoring, "pages", page.id);
    const templateName = headTemplateName(page.kind);
    if (headTemplates.has(templateName) && headTemplates.get(templateName) !== headTemplate) {
      fail(`${name}: head differs from the shared ${templateName} template`);
    }
    headTemplates.set(templateName, headTemplate);
    jsonWrite(join(directory, "page.json"), page);
    write(join(directory, "content.html"), main);
    catalog.push(page.id);
    baseline.pages[name] = baselineEntry(bytes);
  }

  for (const path of filesBelow(join(root, "assets"), () => true)) {
    baseline.assets[slash(relative(root, path))] = hash(readFileSync(path));
  }
  for (const [name, template] of headTemplates) {
    write(join(authoring, "templates", `head-${name}.html`), template);
  }
  jsonWrite(catalogFile, { version: 1, pages: catalog });
  jsonWrite(baselineFile, baseline);
  console.log(`Imported ${catalog.length} pages and ${Object.keys(baseline.assets).length} assets.`);
}

function loadPages() {
  const catalog = json(catalogFile);
  if (catalog.version !== 1 || !Array.isArray(catalog.pages)) fail("Invalid catalogue");
  const pages = [];
  const outputs = new Set();
  const ids = new Set();
  const hasPublishedNotes = json(join(authoring, "notes.json")).notes.some((note) => note.status === "published");
  for (const id of catalog.pages) {
    if (typeof id !== "string" || !/^(?:home|journey|domains-for-sale|(?:builds|startups|ideas)\/[a-z0-9-]+)$/.test(id)) {
      fail(`Invalid content ID: ${id}`);
    }
    const directory = join(authoring, "pages", id);
    const page = json(join(directory, "page.json"));
    if (page.id !== id || !["legacy", "editorial"].includes(page.rendering)) fail(`${id}: unsupported rendering mode`);
    if (page.rendering === "editorial" && !["build", "startup", "idea"].includes(page.kind)) {
      fail(`${id}: editorial rendering is for historical detail pages only`);
    }
    const expectedOutput = id === "home" ? "index.html" : `${id}/index.html`;
    const expectedRoot = id === "home" ? "" : "../".repeat(id.split("/").length);
    const expectedKind = id === "home" || id === "journey" || id === "domains-for-sale" ? {
      home: "home", journey: "journey", "domains-for-sale": "domains",
    }[id] : id.split("/")[0].slice(0, -1);
    if (page.output !== expectedOutput || page.path !== route(expectedOutput)
      || page.root !== expectedRoot || page.kind !== expectedKind || outputs.has(page.output) || ids.has(id)) {
      fail(`${id}: duplicate or inconsistent route`);
    }
    if (page.head.canonical !== `https://mttcnnng.com${page.path}` || page.head.ogUrl !== page.head.canonical) {
      fail(`${id}: canonical and Open Graph URL must match its route`);
    }
    outputs.add(page.output);
    ids.add(id);
    const headTemplate = read(join(authoring, "templates", `head-${headTemplateName(page.kind)}.html`));
    const html = renderPage(page, headTemplate, read(join(directory, "content.html")), hasPublishedNotes);
    if (privateMarker.test(html)) fail(`${id}: private editorial marker found in public output`);
    pages.push({ page, html });
  }
  const gateB = loadGateB(pages);
  for (const result of gateB.pages) {
    if (outputs.has(result.page.output) || ids.has(result.page.id)) fail(`${result.page.id}: duplicate generated route`);
    if (privateMarker.test(result.html)) fail(`${result.page.id}: private editorial marker found in public output`);
    outputs.add(result.page.output);
    ids.add(result.page.id);
  }
  if (privateMarker.test(gateB.sitemap)) fail("Private editorial marker found in sitemap");
  return { pages: [...pages, ...gateB.pages], sitemap: gateB.sitemap };
}

function build() {
  const { pages, sitemap } = loadPages();
  const expected = new Set(pages.map(({ page }) => page.output));
  for (const path of filesBelow(join(root, "notes"), (file) => file.endsWith(`${sep}index.html`))) {
    const name = slash(relative(root, path));
    if (name !== "notes/index.html" && !expected.has(name)) {
      if (!read(path).includes('<meta name="generator" content="mttcnnng static authoring">')) {
        fail(`Unexpected non-generated Note page requires manual review: ${name}`);
      }
      unlinkSync(path);
    }
  }
  for (const { page, html } of pages) write(join(root, page.output), html);
  write(join(root, "sitemap.xml"), sitemap);
  console.log(`Generated ${pages.length} public pages.`);
}

function check(baselineRequested) {
  const { pages, sitemap } = loadPages();
  const issues = [];
  const expected = new Set(pages.map(({ page }) => page.output));
  const actual = publicPages().map((path) => slash(relative(root, path)));
  for (const path of actual) if (!expected.has(path)) issues.push(`Unexpected public page: ${path}`);
  for (const { page, html } of pages) {
    const path = join(root, page.output);
    if (!existsSync(path) || read(path) !== html) issues.push(`Stale generated page: ${page.output}`);
  }
  if (read(join(root, "sitemap.xml")) !== sitemap) issues.push("Stale generated sitemap.xml");

  if (baselineRequested) {
    const baseline = json(baselineFile);
    for (const [name, entry] of Object.entries(baseline.pages)) {
      const path = join(root, name);
      if (!existsSync(path) || hash(readFileSync(path)) !== entry.sha256) issues.push(`Baseline page changed: ${name}`);
    }
    for (const [name, expectedHash] of Object.entries(baseline.assets)) {
      const path = join(root, name);
      if (!existsSync(path) || hash(readFileSync(path)) !== expectedHash) issues.push(`Baseline asset changed: ${name}`);
    }
  }

  if (issues.length) fail(issues.join("\n"));
  console.log(`Generation check passed for ${pages.length} pages${baselineRequested ? " and the captured baseline" : ""}.`);
}

function report() {
  mkdirSync(localEditorial, { recursive: true });
  const notesPath = join(localEditorial, "notes.json");
  if (!existsSync(notesPath)) jsonWrite(notesPath, { editorialTodos: [], factualAudit: [] });
  const notes = json(notesPath);
  for (const key of ["editorialTodos", "factualAudit"]) {
    if (!Array.isArray(notes[key])) fail(`Local notes field ${key} must be an array`);
  }
  const renderItems = (title, items, empty = "No entries recorded.") => `# ${title}\n\n${items.length ? items.map((item) => {
    const fields = Object.entries(item).map(([key, value]) => `- ${key}: ${String(value)}`).join("\n");
    return `## ${item.item ?? "Unassigned"}\n\n${fields}`;
  }).join("\n\n") : empty}\n`;
  const byStatus = (items, status) => items.filter((item) => item.status === status);
  const closed = (items) => items.filter((item) => ["resolved", "intentionally unnecessary"].includes(item.status));
  const validStatuses = new Set(["needs Matt review", "optional future", "resolved", "intentionally unnecessary"]);
  for (const [kind, items] of [["editorial", notes.editorialTodos], ["factual", notes.factualAudit]]) {
    for (const item of items) if (!validStatuses.has(item.status)) fail(`Unknown ${kind} note status: ${item.status}`);
  }
  write(join(localEditorial, "editorial-todos.md"),
    renderItems("Editorial questions requiring Matt", byStatus(notes.editorialTodos, "needs Matt review"), "No editorial questions require Matt now."));
  write(join(localEditorial, "factual-audit.md"),
    renderItems("Unresolved factual questions", byStatus(notes.factualAudit, "needs Matt review"), "No factual questions require Matt now."));
  write(join(localEditorial, "optional-followups.md"),
    renderItems("Optional editorial enrichments", byStatus(notes.editorialTodos, "optional future"))
    + `\n${renderItems("Optional factual details", byStatus(notes.factualAudit, "optional future"))}`);
  write(join(localEditorial, "closed-history.md"),
    renderItems("Closed editorial questions", closed(notes.editorialTodos))
    + `\n${renderItems("Closed factual questions", closed(notes.factualAudit))}`);
  console.log(`Private reports written to ${localEditorial}`);
}

function preview() {
  check(false);
  const pages = new Set(loadPages().pages.map(({ page }) => page.output));
  const assets = new Set(filesBelow(join(root, "assets"), () => true).map((path) => slash(relative(root, path))));
  const allowed = new Set([...pages, ...assets, "sitemap.xml", "robots.txt"]);
  const types = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
    ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  };
  const port = Number(process.argv.find((arg) => arg.startsWith("--port="))?.slice(7) ?? "4173");
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail("Invalid preview port");

  createServer((request, response) => {
    let name;
    const notFound = () => {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end(readFileSync(join(root, "404.html")));
    };
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      name = pathname.slice(1);
      if (!name || name.endsWith("/")) name += "index.html";
      if (name.includes("\\") || name.split("/").includes("..") || !allowed.has(name)) {
        notFound();
        return;
      }
      const path = join(root, name);
      if (!existsSync(path) || !statSync(path).isFile()) throw new Error("Missing public file");
      response.setHeader("Content-Type", types[extname(path)] ?? "application/octet-stream");
      response.end(readFileSync(path));
    } catch {
      notFound();
    }
  }).listen(port, "127.0.0.1", () => console.log(`Preview: http://127.0.0.1:${port}/`));
}

try {
  const command = process.argv[2];
  if (command === "import") importLegacy();
  else if (command === "build") build();
  else if (command === "check") check(process.argv.includes("--baseline"));
  else if (command === "preview") preview();
  else if (command === "report") report();
  else fail("Usage: node tools/site.mjs <import|build|check|preview|report> [--baseline|--port=4173]");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
