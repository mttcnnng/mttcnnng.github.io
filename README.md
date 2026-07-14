# mttcnnng.github.io

Personal GitHub Pages site for `mttcnnng`.

This repository currently contains a polished static placeholder page that can
be served directly by GitHub Pages without a build step.

## Structure

- `index.html` is the root GitHub Pages entry point.
- `assets/css/styles.css` contains the full responsive layout and visual style.
- `assets/js/main.js` provides a small progressive enhancement for the footer year.
- `assets/favicon.svg` is the placeholder favicon.

## Local preview

Open `index.html` directly in a browser, or serve the folder with Node:

```sh
npx serve .
```

Then open the local URL printed by `serve`.

## Deployment

This site is intended for branch-based GitHub Pages publishing from the
repository root. After merging changes to the publishing branch, configure
GitHub Pages to serve from the root directory if it is not already enabled.

No npm install, build command, framework, backend, or GitHub Actions workflow is
required for the current placeholder site.
