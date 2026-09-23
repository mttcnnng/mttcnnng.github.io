import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderArchive, renderContact, renderNewPage, renderNotFound, renderNote,
  renderNotesIndex, renderWorkbench,
} from "../_authoring/templates/new-pages.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const authoring = join(root, "_authoring");
const historicalKinds = { build: 26, startup: 5, idea: 15 };
const states = new Set(["building", "exploring", "thinking", "shelved"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function fail(message) { throw new Error(message); }
function readJson(name) { return JSON.parse(readFileSync(join(authoring, name), "utf8")); }
function validDate(value) {
  return typeof value === "string" && datePattern.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function validateWorkbench(model, records) {
  if (!model || !Array.isArray(model.entries)) fail("Workbench entries must be an array");
  if (model.reviewedAt !== null && !validDate(model.reviewedAt)) fail("Workbench reviewedAt must be a manually authored ISO date or null");
  const ids = new Set();
  const recordIds = new Set(records.map(({ page }) => page.id));
  for (const entry of model.entries) {
    if (!entry || typeof entry !== "object" || !/^[a-z0-9-]+$/.test(entry.id ?? "") || ids.has(entry.id)) fail("Workbench IDs must be unique slugs");
    ids.add(entry.id);
    if (!states.has(entry.status)) fail(`${entry.id}: invalid Workbench status`);
    if (typeof entry.name !== "string" || !entry.name.trim() || typeof entry.description !== "string" || !entry.description.trim()) fail(`${entry.id}: name and description are required`);
    if (typeof entry.visible !== "boolean" || !Number.isInteger(entry.sortOrder) || entry.sortOrder < 0) fail(`${entry.id}: visible must be Boolean and sortOrder a nonnegative integer`);
    if (!Array.isArray(entry.relatedIds) || new Set(entry.relatedIds).size !== entry.relatedIds.length || entry.relatedIds.some((id) => !recordIds.has(id))) fail(`${entry.id}: invalid related historical ID`);
    for (const key of ["startedAt", "shelvedAt", "updatedAt"]) {
      if (entry[key] !== null && entry[key] !== undefined && !validDate(entry[key])) fail(`${entry.id}: ${key} must be an ISO date or null`);
    }
    if (entry.shelvedReason !== null && entry.shelvedReason !== undefined && typeof entry.shelvedReason !== "string") fail(`${entry.id}: shelvedReason must be text or null`);
    if (entry.url !== null && entry.url !== undefined && (typeof entry.url !== "string" || !/^https:\/\//.test(entry.url))) fail(`${entry.id}: url must be an https URL or null`);
    if (entry.status !== "shelved" && (entry.shelvedAt || entry.shelvedReason)) fail(`${entry.id}: shelving fields require shelved status`);
  }
}

function validateNotes(model) {
  if (!model || !Array.isArray(model.notes)) fail("Notes manifest must have a notes array");
  const ids = new Set();
  for (const note of model.notes) {
    if (!note || !/^[a-z0-9-]+$/.test(note.id ?? "") || ids.has(note.id)) fail("Note IDs must be unique slugs");
    ids.add(note.id);
    if (!["draft", "published"].includes(note.status)) fail(`${note.id}: invalid Note status`);
    if (note.status === "draft" && (Object.keys(note).some((key) => !["id", "status"].includes(key))
      || existsSync(join(authoring, "notes", `${note.id}.html`)))) {
      fail(`${note.id}: keep draft content only in .local-editorial/notes`);
    }
    if (note.status === "published") {
      if (typeof note.title !== "string" || !note.title.trim() || typeof note.description !== "string" || !note.description.trim() || !validDate(note.publishedAt)) fail(`${note.id}: published Note requires title, description and publishedAt`);
      if (!existsSync(join(authoring, "notes", `${note.id}.html`))) fail(`${note.id}: published Note body is missing`);
    }
  }
}

function page(id, kind, title, description) {
  const output = id === "404" ? "404.html" : `${id}/index.html`;
  const path = id === "404" ? "/404.html" : `/${id}/`;
  // GitHub Pages serves 404.html at the unknown URL, which may be many levels deep.
  const rootPath = id === "404" ? "/" : "../".repeat(id.split("/").length);
  return { id, kind, title, description, output, path, root: rootPath, rendering: "generated" };
}

export function loadGateB(legacyPages) {
  const originalEvidence = readJson("legacy-evidence-baseline.json");
  const records = legacyPages.map(({ page: legacy }) => legacy)
    .filter((legacy) => Object.hasOwn(historicalKinds, legacy.kind))
    .map((legacy) => ({ page: legacy, archive: legacy.archive }));
  if (records.length !== 46) fail(`Expected 46 historical records, found ${records.length}`);
  for (const [kind, expected] of Object.entries(historicalKinds)) {
    if (records.filter((record) => record.page.kind === kind).length !== expected) fail(`Expected ${expected} ${kind} records`);
  }
  for (const { page: legacy, archive } of records) {
    if (!archive || !Object.hasOwn(archive, "dateLabel") || !Object.hasOwn(archive, "sortYear")) fail(`${legacy.id}: missing archive date`);
    if (archive.sortYear === null) {
      if (archive.dateLabel !== null || /^\d{4}/.test(legacy.listing.dateLabel)) fail(`${legacy.id}: invalid undated archive record`);
    } else if (!Number.isInteger(archive.sortYear) || !/^\d{4}(?:\u2013(?:\d{4}|Present))?$/.test(archive.dateLabel ?? "")
      || Number(archive.dateLabel.slice(0, 4)) !== archive.sortYear) {
      fail(`${legacy.id}: archive date must retain recorded year or range`);
    }
    let originalLabel = /^\d{4}$/.test(legacy.listing.dateLabel) ? legacy.listing.dateLabel : null;
    if (legacy.kind === "startup") {
      if (legacy.rendering === "editorial") {
        originalLabel = originalEvidence[legacy.id]?.dateLabel;
      } else {
        const originalContent = readFileSync(join(authoring, "pages", legacy.id, "content.html"), "utf8");
        const yearText = originalContent.match(/<p class="project-year">([^<]+)<\/p>/)?.[1];
        originalLabel = yearText?.split(" &middot;")[0].replaceAll("&ndash;", "–");
      }
    }
    if (archive.dateLabel !== originalLabel) fail(`${legacy.id}: archive date differs from original content`);
    if (!legacy.listing?.title || !legacy.listing?.summary) fail(`${legacy.id}: missing archive summary`);
  }
  const workbench = readJson("workbench.json");
  validateWorkbench(workbench, records);
  const notes = readJson("notes.json");
  validateNotes(notes);
  const published = notes.notes.filter((note) => note.status === "published");
  const hasPublishedNotes = published.length > 0;
  const pages = [];
  const add = (spec, main) => pages.push({ page: spec, html: renderNewPage(spec, main, hasPublishedNotes) });
  for (const [id, filter, title, description] of [
    ["archive", "all", "Archive | Matt", "A complete historical archive of builds, startups and ideas by Matt Canning."],
    ["archive/builds", "build", "Builds archive | Matt", "Browse Matt Canning's historical software builds, with dates and summaries."],
    ["archive/startups", "startup", "Startups archive | Matt", "Browse Matt Canning's historical startup projects, with dates and summaries."],
    ["archive/ideas", "idea", "Ideas archive | Matt", "Browse Matt Canning's historical ideas and concepts, with dates and summaries."],
  ]) {
    const spec = page(id, "archive", title, description);
    add(spec, renderArchive(spec, records, filter));
  }
  add(page("workbench", "workbench", "Workbench | Matt", "Current work and ideas by Matt Canning."), renderWorkbench(workbench, records));
  add(page("notes", "notes", "Notes | Matt", hasPublishedNotes ? "Published notes by Matt Canning." : "Notes by Matt Canning will appear here when published."), renderNotesIndex(notes.notes));
  add(page("contact", "contact", "Contact | Matt", "Public profiles and ways to contact Matt Canning."), renderContact());
  add(page("404", "not-found", "Page not found | Matt", "The requested page could not be found."), renderNotFound());
  for (const note of published) {
    const spec = page(`notes/${note.id}`, "notes", `${note.title} | Matt`, note.description);
    const body = readFileSync(join(authoring, "notes", `${note.id}.html`), "utf8");
    add(spec, renderNote(note, body));
  }
  const base = readFileSync(join(authoring, "sitemap-base.xml"), "utf8");
  if (!/<\/urlset>\r?\n?$/.test(base)) fail("Base sitemap has changed unexpectedly");
  const sitemapRoutes = pages.filter(({ page: spec }) => !["404", "notes"].includes(spec.id) && (spec.kind !== "notes" || hasPublishedNotes))
    .map(({ page: spec }) => spec.path);
  if (hasPublishedNotes) sitemapRoutes.push("/notes/");
  const eol = base.includes("\r\n") ? "\r\n" : "\n";
  const extra = sitemapRoutes.map((path) => ["  <url>", `    <loc>https://mttcnnng.com${path}</loc>`, "  </url>"].join(eol)).join(eol);
  const sitemap = base.replace(/<\/urlset>\r?\n?$/, `${extra}${eol}</urlset>${eol}`);
  return { pages, sitemap, hasPublishedNotes, records, workbench, notes };
}
