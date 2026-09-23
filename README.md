# mttcnnng.github.io

Static GitHub Pages portfolio for `mttcnnng`.

Live site: <https://mttcnnng.com>

The published site uses semantic HTML, vanilla CSS, and small progressive
enhancement scripts for the footer year and Journey route state. A local,
dependency-free Node tool now generates the checked-in HTML. GitHub Pages still
publishes the repository root; it does not run the generator.

## Structure

- `index.html` is a selective introduction with seven works, three ideas, a
  Workbench preview, a Journey bridge and career context. Archive owns the full
  historical catalogue.
- `builds/*/index.html` contains static build detail pages for the portfolio.
- `ideas/*/index.html` contains static idea detail pages.
- `journey/index.html` is the eight-chapter product archaeology Journey page.
  Chapter 08 deliberately overlaps Chapter 07 and remains unfinished.
- `startups/*/index.html` contains static startup detail pages.
- `archive/` contains the complete historical catalogue and its three category
  views; `workbench/` is the current-work page.
- `notes/` has an empty index until a real Note is published; `contact/` lists
  confirmed public profiles, and root `404.html` handles missing routes.
- `assets/css/styles.css` contains design tokens, shared components, page
  layouts, and responsive rules.
- `assets/css/journey.css` contains the Journey page's path, waypoint, chapter,
  and responsive layout rules.
- `assets/js/main.js` updates the current year when JavaScript is available.
- `assets/js/journey.js` progressively reveals Journey route segments as they
  enter the viewport; all Journey content works without it.
- `assets/img/profile-matt.webp` is the displayed Home portrait; its original
  `profile-matt.png` is retained.
- `assets/img/social-matt-canning.jpg` is the shared 1200×630 social card;
  MP3 Home Player uses `assets/img/builds/mp3-home-player-social.jpg`.
- `assets/img/world-map.svg` is the optimized Natural Earth map shown in a
  closed, career-wide context disclosure in Journey Chapter 04.
- `assets/img/builds/` contains generated and reused images for builds. Original
  PNGs are retained; optimized WebP versions are served in the page.
- `assets/img/ideas/` contains generated monochrome concept images for ideas,
  with original PNGs and optimized WebP page assets.
- `assets/img/startups/` contains generated and reused images for startup pages,
  with original PNGs and optimized WebP page assets.
- `assets/img/journey/` contains optimized chapter-anchor images for Journey.
- `assets/favicon.svg` is the monochrome site favicon.
- `CNAME` configures `mttcnnng.com` as the GitHub Pages custom domain.
- `_authoring/catalog.json` lists the 49 original pages. Each
  `_authoring/pages/<id>/` directory holds publication-safe metadata in
  `page.json` and public main content in `content.html`.
  `_authoring/templates/` holds four shared head templates and the site shell
  used for the header, footer, and legacy pages. The new-page template renders
  Archive, Workbench, Notes, Contact, and 404 from structured authoring data.
- `_authoring/workbench.json` holds manually authored current-work entries.
  `_authoring/notes.json` is the Notes publication manifest; published Note
  bodies live in `_authoring/notes/<id>.html` when one is ready.
- `_authoring/sitemap-base.xml` preserves the original 49 sitemap entries
  without unverified `lastmod` dates; new public routes are appended
  deterministically during generation.
- `_authoring/baseline.json` records hashes of pre-generator HTML and assets,
  plus the original headings, anchors, links, and image references.
- `_authoring/legacy-prose-baseline.json` records text digests for the 40 legacy
  introductions and narratives; Gate B validates them after generation.
- `_authoring/legacy-evidence-baseline.json` holds only media references, image
  descriptions, links, anchors, and the original startup date needed to check
  the six editorial pilots. Superseded full-page copies stay out of the public
  repository.
- `tools/site.mjs` generates, checks, previews, and reports on the site.
- `tools/gate-b.mjs` validates and generates the new information architecture.
- `tools/validate-gate-b.mjs` checks Archive coverage, legacy preservation,
  Notes visibility, Contact, 404, and the sitemap.
- `tools/validate-gate-c.mjs` checks Home's exact selection and Workbench preview,
  retained fragments, the Journey map move and Chapter 08, the curated Workbench,
  and the empty Notes boundary.
- `tools/validate-gate-d.mjs` checks the six editorial pilots, the 40 remaining
  legacy detail pages, and preservation of source evidence and media.
- `_config.yml` excludes authoring files and tools from GitHub Pages output.
- `.local-editorial/` is gitignored. It contains private working notes and
  reports and is never read by public generation or served by local preview.
- `tools/validate-journey.mjs` compares Journey's historical entries with the
  extracted catalogue and verifies their local detail-page links.
- `tools/validate-site.mjs` checks metadata, headings, images, local references,
  cross-page anchors, indexability, social cards, the sitemap, and external-link
  safety across every page.
- `tools/generate-gate-e-images.py` regenerates the shared social cards and
  optimized portrait from existing assets using Pillow.
- `tools/remove-unused-css.mjs` removes selectors only when their classes are
  absent from generated pages, authoring markup/templates, and runtime scripts.
- `tools/optimize_detail_images.py` regenerates the detail-page WebP assets from
  their canonical `*-playful.png` sources.
- `tools/generate_world_map.py` regenerates the Journey map from the
  public-domain Natural Earth 1:110m land dataset.

## Local preview

Run the allowlisted local preview after generating the site:

```sh
node tools/site.mjs preview
```

Open `http://127.0.0.1:4173/`. To check nested-page asset paths, also test
`/archive/`, `/archive/builds/`, `/workbench/`, `/contact/`,
`/notes/`, `/404.html`, `/builds/harkster/`, and `/journey/`. The preview serves
only generated pages, assets, `robots.txt`, and `sitemap.xml`; `_authoring/`, `tools/`, and
`.local-editorial/` return 404. Pass `--port=4174` to use another port.

## Authoring and generation

Edit the relevant `_authoring/pages/<id>/page.json` fields for page metadata and
`content.html` for the page's existing main content. Head markup shared across
the detail pages lives in `_authoring/templates/head-detail.html`; Home,
Journey, and Domains for Sale have their own head variants. The shared header
and footer live in `_authoring/templates/site.mjs`. The `head` values in page
metadata are stored in their HTML-encoded form to preserve the existing
published bytes (for example, `&#39;` in an attribute).

Six historical detail pages use editorial rendering: Harkster, MP3 Home Player,
Systematic Trading Strategy, HEDGD Limited, API of You, and Point-of-Sale
Betting Terminals. The other 40 remain in legacy mode. The six pilots' original
public evidence is checked against the small manifest above. The shared site shell and
head metadata remain the same in both modes; editorial pages use a restrained
prose-first layout with technical notes where the source supports them.

`_authoring/templates/metadata.mjs` applies the public title rule and resolves
social images. Most titles end in `| Matt Canning`; long project titles stay
shorter. The MPFrequency build and startup retain distinct titles. All pages
use a 1200×630 social card with dimensions and alt metadata, and MP3 Home
Player uses its original photograph. The empty Notes index is `noindex` and
excluded from the sitemap until a Note is published; `robots.txt` remains the
production policy. The optional homepage JSON-LD was left out of Gate E.

The shared header/footer and Journey shell cap at 1160px; Home and all detail
pages cap at 900px. Prose caps at 680px, ordinary media at 760px, and posters
at 900px; supporting illustrations cap at 520px. Legacy detail pages keep
their original wording and images, with a 520px narrative and 340px image
separated by 40px above 1100px. Below that, the narrative precedes the
illustration.
Each detail page's
`page.json` also has an `archive` object with a recorded `dateLabel` and
`sortYear` (the starting year for a range). `null` for both means the date was
not recorded. The Archive reads these entries directly from the catalogue and
does not scrape the homepage. Keep historical dates at their recorded
precision; do not infer months or assign a date to an undated item.

The Gate C homepage selection and copy live in
`_authoring/pages/home/content.html`; its title and description live in the
adjacent `page.json`. Journey Chapter 08 and the map disclosure live in
`_authoring/pages/journey/content.html`. The ten Home selections are an
editorial subset with summaries copied from the catalogue; editing them does
not change Archive completeness. The map's displayed locations provide
career-wide context and are not confined to Chapter 04's dates.

### Workbench

Edit `_authoring/workbench.json` to add or update the manually confirmed entries.
The current `reviewedAt` is `2026-09-23`; it is an editorial review date, not a
generated timestamp. Each entry has a stable
lowercase `id`, `name`, `description`, `status`, `sortOrder`, `visible`, and
`relatedIds`. Supported statuses are `building`, `exploring`, `thinking`, and
`shelved`. Optional fields are `startedAt`, `shelvedAt`, `shelvedReason`,
`url`, and `updatedAt`; dates use `YYYY-MM-DD`, and public URLs use HTTPS.

Entry shape (illustrative only; no entry is seeded):

```json
{
  "id": "entry-id",
  "name": "Public name",
  "description": "Publication-safe summary.",
  "status": "exploring",
  "startedAt": null,
  "shelvedAt": null,
  "shelvedReason": null,
  "url": null,
  "relatedIds": [],
  "sortOrder": 10,
  "visible": true,
  "updatedAt": null
}
```

Entries appear in their status section ordered by ascending `sortOrder`, then
ID for ties. Set `visible` to `false` to keep an entry out of the page without
deleting it. Visibility is not a privacy control because the authoring file is
versioned. Put a historical content ID from `_authoring/catalog.json` in
`relatedIds` to link that record, for example `builds/harkster`; validation
rejects an unknown ID. Change `status` to move an entry between sections. To
shelve one, set `status` to `shelved` and, when known, supply `shelvedAt` and
`shelvedReason`; clear shelving fields if you move it back to an active state.
Set the page-level `reviewedAt` yourself only when you have reviewed the
current-work list. Neither generation nor deployment changes it.

Only publication-safe Workbench content belongs in this versioned file. Keep
private working notes in `.local-editorial/`.

### Notes

Private drafts and unpublished reflections belong in the gitignored
`.local-editorial/notes/` directory. The generator never reads that directory.
When ready to publish, add publication-safe `id`, `status: "published"`,
`title`, `description`, and manually chosen `publishedAt` to
`_authoring/notes.json`, then put the public HTML body in
`_authoring/notes/<id>.html`. Manifest order controls index order. A
`status: "draft"` reservation may contain only an ID and status; its content
stays local and generates no detail page. While no Note is published, the
restrained `/notes/` index exists but Notes is absent from primary navigation
and the sitemap. No Note has been published through Gate E.

Generate the checked-in HTML after editing authoring content:

```sh
node tools/site.mjs build
```

Check that checked-in pages match their authoring sources:

```sh
node tools/site.mjs check
```

`node tools/site.mjs check --baseline` compares the 49 original pages and
assets against their pre-generator hashes. It is a Gate A check and will now
fail on the intentionally changed navigation, footer, and detail back-links.

Generate the private working reports:

```sh
node tools/site.mjs report
```

This reads `.local-editorial/notes.json`. `editorial-todos.md` lists only
editorial questions that still need Matt; `factual-audit.md` lists unresolved
factual questions. `optional-followups.md` keeps non-blocking editorial and
factual ideas separate, and `closed-history.md` preserves resolved or
intentionally unnecessary questions outside the active reports. All four
reports stay in the ignored directory. The notes file has separate
`editorialTodos` and `factualAudit` arrays. These files are local working
material, not publication sources. Do not place private reflections or audit
notes in versioned authoring files or generated HTML. The `import` command was
used once to capture the existing 49 pages; it refuses to overwrite authoring
data and is not part of routine editing.

## Content validation

After authoring changes, run:

```sh
node tools/site.mjs check
node tools/validate-site.mjs
node tools/validate-journey.mjs
node tools/validate-gate-b.mjs
node tools/validate-gate-c.mjs
node tools/validate-gate-d.mjs
```

The site validator checks all 57 pages, including `404.html`. The Journey
validator requires all 46 catalogue records to appear exactly once as Journey
entries, with valid local targets and matching type totals. The Gate B
validator checks all Archive views and preservation of historical detail
anchors, headings, media and routes for the 40 unchanged legacy pages. The
Gate C validator checks the selective Home composition and Journey changes.
The Gate D validator checks that only the six approved pilots use editorial
rendering, compares their evidence baseline with public media, links and
anchors, and checks selected facts. If local factual-audit notes are present,
an active unresolved issue on a pilot blocks validation. Optional historical
details do not block an otherwise factual page. Private TODOs remain in
`.local-editorial/` and are never read by the public generator.

After replacing a `*-playful.png` source image, regenerate its optimized WebP
counterpart with Pillow available:

```sh
python tools/optimize_detail_images.py
```

## Deployment

This site is published from the repository root using branch-based GitHub Pages
and the custom domain `mttcnnng.com`. Keep the root `CNAME` file in place when
deploying. All stylesheets, scripts, page links, and assets use relative paths so
the site can also work from a repository subpath.

No npm install, generated CSS, framework, backend, or GitHub Actions workflow
is required. Commit the generated HTML alongside its authoring changes. The
publishing source remains the repository root.

The custom `404.html` uses root-relative links and assets because GitHub Pages
can serve it while the browser remains at an arbitrarily deep missing URL.
This matches the configured `mttcnnng.com` custom domain; ordinary pages use
relative links so they continue to work from a repository subpath.
