import { renderFooter, renderHeader } from "./site.mjs";
import { publicTitle, socialImage } from "./metadata.mjs";

export function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderNewPage(page, main, hasPublishedNotes = false) {
  const title = escapeHtml(publicTitle(page.title));
  const description = escapeHtml(page.description);
  const canonical = `https://mttcnnng.com${page.path}`;
  const social = socialImage(page);
  const root = page.root;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <meta name="generator" content="mttcnnng static authoring">
    <meta name="theme-color" content="#ffffff">
    ${page.kind === "not-found" || page.kind === "notes" && !hasPublishedNotes ? '<meta name="robots" content="noindex">\n    ' : ""}<link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${social.url}">
    <meta property="og:image:alt" content="${social.alt}">
    <meta property="og:image:width" content="${social.width}">
    <meta property="og:image:height" content="${social.height}">
    <meta property="og:image:type" content="${social.type}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${social.url}">
    <meta name="twitter:image:alt" content="${social.alt}">
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="${root}assets/css/styles.css">
    <script src="${root}assets/js/main.js" defer></script>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
${renderHeader(page, hasPublishedNotes)}
    <main id="main-content" class="page-shell editorial-page">
${main}
    </main>
${renderFooter(page)}
  </body>
</html>
`;
}

const archiveKinds = [
  ["all", "All", "archive/"],
  ["build", "Builds", "archive/builds/"],
  ["startup", "Startups", "archive/startups/"],
  ["idea", "Ideas", "archive/ideas/"],
];

function archiveRow(record, root) {
  const page = record.page;
  const label = record.archive.dateLabel ?? "Date not recorded";
  return `        <li class="archive-row">
          <a href="${root}${page.path.slice(1)}">
            <span class="archive-row__meta"><span>${escapeHtml(label)}</span><span>${escapeHtml(page.kind)}</span></span>
            <span class="archive-row__copy"><strong>${escapeHtml(page.listing.title)}</strong><span>${escapeHtml(page.listing.summary)}</span></span>
            <span class="archive-row__arrow" aria-hidden="true">↗</span>
          </a>
        </li>`;
}

export function renderArchive(page, records, filter) {
  const label = filter === "all" ? "Archive" : `${filter[0].toUpperCase()}${filter.slice(1)}s`;
  const selected = filter === "all" ? records : records.filter((record) => record.page.kind === filter);
  const dated = selected.filter((record) => record.archive.sortYear !== null)
    .sort((a, b) => b.archive.sortYear - a.archive.sortYear || a.page.listing.title.localeCompare(b.page.listing.title));
  const undated = selected.filter((record) => record.archive.sortYear === null)
    .sort((a, b) => a.page.listing.title.localeCompare(b.page.listing.title));
  const filters = archiveKinds.map(([kind, text, path]) => `      <a href="${page.root}${path}"${filter === kind ? ' aria-current="page"' : ""}>${text}</a>`).join("\n");
  const group = (title, items) => items.length ? `      <section class="archive-group" aria-label="${title}">
        <h2>${title}</h2>
        <ol class="archive-list">
${items.map((record) => archiveRow(record, page.root)).join("\n")}
        </ol>
      </section>` : "";
  return `      <div class="editorial-intro">
        <p class="eyebrow">Historical record</p>
        <h1>${label}</h1>
        <p>${filter === "all" ? "Builds, startups and ideas across the years." : `The ${filter}s in the historical archive.`}</p>
      </div>
      <nav class="archive-filters" aria-label="Archive categories">
${filters}
      </nav>
${group("Chronology", dated)}
${group("Date not recorded", undated)}
`;
}

const workbenchStates = [
  ["building", "Building"], ["exploring", "Exploring"],
  ["thinking", "Thinking about"], ["shelved", "Shelved"],
];

function formatReviewDate(date) {
  const [year, month, day] = date.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

export function renderWorkbench(model, records) {
  const visible = model.entries.filter((entry) => entry.visible);
  const byId = new Map(records.map((record) => [record.page.id, record.page]));
  const sections = workbenchStates.map(([status, heading]) => {
    const entries = visible.filter((entry) => entry.status === status)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    if (!entries.length) return "";
    return `      <section class="workbench-group" aria-labelledby="workbench-${status}">
        <h2 id="workbench-${status}">${heading}</h2>
        <div class="workbench-list">
${entries.map((entry) => {
  const related = entry.relatedIds.map((id) => {
    const page = byId.get(id);
    return `<a href="../${page.path.slice(1)}">${escapeHtml(page.listing.title)}</a>`;
  });
  const optional = [
    entry.startedAt && `<p class="workbench-entry__meta">Started ${escapeHtml(entry.startedAt)}</p>`,
    entry.updatedAt && `<p class="workbench-entry__meta">Updated ${escapeHtml(entry.updatedAt)}</p>`,
    status === "shelved" && entry.shelvedAt && `<p class="workbench-entry__meta">Shelved ${escapeHtml(entry.shelvedAt)}</p>`,
    status === "shelved" && entry.shelvedReason && `<p>${escapeHtml(entry.shelvedReason)}</p>`,
    related.length && `<p class="workbench-entry__links">Related: ${related.join(" · ")}</p>`,
    entry.url && `<p class="workbench-entry__links"><a href="${escapeHtml(entry.url)}">Visit project ↗</a></p>`,
  ].filter(Boolean).map((line) => `            ${line}`).join("\n");
  return `          <article class="workbench-entry">
            <h3>${escapeHtml(entry.name)}</h3>
            <p>${escapeHtml(entry.description)}</p>${optional ? `\n${optional}` : ""}
          </article>`;
}).join("\n")}
        </div>
      </section>`;
  }).filter(Boolean);
  return `      <div class="editorial-intro">
        <p class="eyebrow">Current work</p>
        <h1>Workbench</h1>
        <p>What I am building, exploring, thinking about and shelving.</p>
        ${model.reviewedAt ? `<p class="editorial-intro__reviewed">Last reviewed <time datetime="${escapeHtml(model.reviewedAt)}">${escapeHtml(formatReviewDate(model.reviewedAt))}</time></p>` : ""}
      </div>
      ${sections.length ? sections.join("\n") : '<p class="editorial-empty">Current work will live here.</p>'}
`;
}

export function renderNotesIndex(notes) {
  const published = notes.filter((note) => note.status === "published");
  return `      <div class="editorial-intro">
        <p class="eyebrow">Writing</p>
        <h1>Notes</h1>
      </div>
      ${published.length ? `<ol class="notes-list">${published.map((note) => `<li><a href="${escapeHtml(note.id)}/">${escapeHtml(note.title)}</a><span>${escapeHtml(note.publishedAt)}</span><p>${escapeHtml(note.description)}</p></li>`).join("")}</ol>` : '<p class="editorial-empty">Notes will appear here when published.</p>'}
`;
}

export function renderNote(note, body) {
  return `      <article class="note-detail">
        <a class="back-link" href="../"><span aria-hidden="true">&larr;</span> Back to notes</a>
        <p class="eyebrow">Note · ${escapeHtml(note.publishedAt)}</p>
        <h1>${escapeHtml(note.title)}</h1>
        <p class="note-detail__lede">${escapeHtml(note.description)}</p>
        <div class="note-detail__body">
${body}
        </div>
      </article>`;
}

export function renderContact() {
  return `      <div class="editorial-intro">
        <p class="eyebrow">Contact</p>
        <h1>Get in touch</h1>
        <p>You can find me through these public profiles.</p>
      </div>
      <ul class="contact-list">
        <li><a href="https://x.com/mttcnnng" rel="me">X <span aria-hidden="true">↗</span></a></li>
        <li><a href="https://www.linkedin.com/in/mttcnnng" rel="me">LinkedIn <span aria-hidden="true">↗</span></a></li>
        <li><a href="https://github.com/mttcnnng" rel="me">GitHub <span aria-hidden="true">↗</span></a></li>
      </ul>
      <p class="contact-domains"><a href="../domains-for-sale/">Domains for sale <span aria-hidden="true">↗</span></a></p>
`;
}

export function renderNotFound() {
  return `      <div class="editorial-intro">
        <p class="eyebrow">Page not found</p>
        <h1>404</h1>
        <p>That page could not be found. You can continue from one of these pages.</p>
      </div>
      <nav class="not-found-links" aria-label="Continue browsing">
        <a href="/">Home</a>
        <a href="/journey/">Journey</a>
        <a href="/archive/">Archive</a>
      </nav>
`;
}
