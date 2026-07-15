# mttcnnng.github.io

Static GitHub Pages portfolio for `mttcnnng`.

The site is implemented with semantic HTML, vanilla CSS, and small progressive
enhancement scripts for the footer year and Journey route state. It has no
framework, no backend, and no build step.

## Structure

- `index.html` is the homepage and personal index.
- `builds/*/index.html` contains static build detail pages for the portfolio.
- `ideas/*/index.html` contains static idea detail pages.
- `journey/index.html` is the seven-chapter product archaeology Journey page.
- `startups/*/index.html` contains static startup detail pages.
- `assets/css/styles.css` contains design tokens, shared components, page
  layouts, and responsive rules.
- `assets/css/journey.css` contains the Journey page's path, waypoint, chapter,
  and responsive layout rules.
- `assets/js/main.js` updates the current year when JavaScript is available.
- `assets/js/journey.js` progressively reveals Journey route segments as they
  enter the viewport; all Journey content works without it.
- `assets/img/profile-matt.png` is the profile portrait used by the homepage.
- `assets/img/world-map.svg` is the optimized Natural Earth map used by the
  homepage global-footprint section.
- `assets/img/builds/` contains generated and reused images for builds. Original
  PNGs are retained for social metadata; optimized WebP versions are served in
  the page.
- `assets/img/ideas/` contains generated monochrome concept images for ideas,
  with original PNGs and optimized WebP page assets.
- `assets/img/startups/` contains generated and reused images for startup pages,
  with original PNGs and optimized WebP page assets.
- `assets/img/journey/` contains optimized chapter-anchor images for Journey.
- `assets/favicon.svg` is the monochrome site favicon.
- `tools/validate-journey.mjs` compares Journey's primary entries with the
  homepage portfolio index and verifies their local detail-page links.
- `tools/validate-site.mjs` checks metadata, headings, images, local references,
  cross-page anchors, and external-link safety across every page.
- `tools/optimize_detail_images.py` regenerates the detail-page WebP assets from
  their canonical `*-playful.png` sources.
- `tools/generate_world_map.py` regenerates the homepage map from the
  public-domain Natural Earth 1:110m land dataset.

## Local preview

Open `index.html` directly in a browser, or serve the repository root with any
static server:

```sh
npx serve .
```

Then open the local URL printed by the server. To check nested-page asset paths,
also test `builds/harkster/` and `journey/`.

## Content validation

After changing the homepage portfolio index or Journey entry list, run:

```sh
node tools/validate-site.mjs
node tools/validate-journey.mjs
```

The site validator checks all 49 pages. The Journey validator additionally
requires all 46 homepage builds, startups, and ideas to appear exactly once as
primary Journey entries, with valid local targets and matching type totals.

After replacing a `*-playful.png` source image, regenerate its optimized WebP
counterpart with Pillow available:

```sh
python tools/optimize_detail_images.py
```

## Deployment

This site is intended for branch-based GitHub Pages publishing from the
repository root. All stylesheets, scripts, page links, and assets use relative
paths so the site can also work from a repository subpath.

No npm install, build command, generated CSS, framework, backend, or GitHub
Actions workflow is required.
