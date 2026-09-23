# Repository Guidelines

## Project Structure & Module Organization

This is a static GitHub Pages portfolio with no framework or backend. A dependency-free Node generator reads `_authoring/` and writes checked-in public HTML. The root `index.html` is the selective homepage with seven works; `archive/` holds the complete historical catalogue, and `workbench/` holds current work. Detail pages live under `builds/`, `ideas/`, and `startups/`; exactly six use editorial rendering and 40 retain legacy content. `journey/` is the eight-chapter timeline. Shared styling is in `assets/css/styles.css`, Journey styling in `assets/css/journey.css`, and small progressive scripts in `assets/js/`. Keep page links and assets relative so the site works from the repository root or a GitHub Pages subpath.

## Build, Test, and Development Commands

There is no package install. After editing `_authoring/`, regenerate and check public files:

```sh
node tools/site.mjs build
node tools/site.mjs check
node tools/validate-site.mjs
node tools/validate-journey.mjs
node tools/validate-gate-b.mjs
node tools/validate-gate-c.mjs
node tools/validate-gate-d.mjs
node tools/site.mjs preview
```

Preview at `http://127.0.0.1:4173/`; check nested routes such as `/builds/harkster/`, `/archive/`, and `/journey/`. GitHub Pages publishes the generated repository root and does not run the generator.

## Coding Style & Naming Conventions

Use semantic HTML and vanilla CSS/JavaScript. Match the existing two-space indentation in HTML and keep attributes readable across multiple lines when they become long. CSS should use the existing custom properties in `:root` before adding new colors, spacing, or font values. Class names follow a BEM-like pattern such as `site-header__inner` and state classes such as `is-active`. Use lowercase kebab-case for directories, page slugs, and image filenames.

## Testing Guidelines

The existing Node validators protect content and generated output. Validate changes in a browser at desktop and mobile widths. Check navigation, image loading, focus states, responsive layout, and nested-page asset paths. For content changes, confirm metadata such as `<title>`, descriptions, social tags, and indexability still match the page. Keep historical dates, evidence, media, Archive chronology, and the six/40 rendering split intact.

## Commit & Pull Request Guidelines

The available local history does not show a project-specific commit convention. Use short, imperative commit messages, for example `Update journey timeline copy` or `Add build detail image`. Pull requests should describe the user-facing change, list manually tested pages and viewport sizes, and include screenshots for visual changes. Link related issues when applicable.

## Security & Configuration Tips

Do not add secrets, analytics keys, or private data to this public static site. Avoid introducing runtime dependencies unless they are necessary and documented in `README.md`.
