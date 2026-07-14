# mttcnnng.github.io

Static GitHub Pages portfolio for `mttcnnng`.

The site is implemented with semantic HTML, vanilla CSS, and a tiny progressive
enhancement script for the footer year. It has no framework, no backend, and no
build step.

## Structure

- `index.html` is the homepage and personal index.
- `builds/*/index.html` contains static build detail pages for the portfolio.
- `ideas/*/index.html` contains static idea detail pages.
- `journey/index.html` is the My Journey timeline page.
- `assets/css/styles.css` contains design tokens, shared components, page
  layouts, and responsive rules.
- `assets/js/main.js` updates the current year when JavaScript is available.
- `assets/img/profile-matt.png` is the profile portrait used by the homepage.
- `assets/img/builds/` contains generated monochrome concept images for builds.
- `assets/img/ideas/` contains generated monochrome concept images for ideas.
- `assets/favicon.svg` is the monochrome site favicon.

## Local preview

Open `index.html` directly in a browser, or serve the repository root with any
static server:

```sh
npx serve .
```

Then open the local URL printed by the server. To check nested-page asset paths,
also test `builds/harkster/` and `journey/`.

## Deployment

This site is intended for branch-based GitHub Pages publishing from the
repository root. All stylesheets, scripts, page links, and assets use relative
paths so the site can also work from a repository subpath.

No npm install, build command, generated CSS, framework, backend, or GitHub
Actions workflow is required.
