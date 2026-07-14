# Repository Guidelines

## Project Structure & Module Organization

This is a static GitHub Pages portfolio with no framework, backend, or build step. The root `index.html` is the homepage. Portfolio detail pages live under `builds/*/index.html`, idea pages under `ideas/*/index.html`, and the timeline page under `journey/index.html`. Shared styling is in `assets/css/styles.css`; the only shared script is `assets/js/main.js`, which updates the footer year. Images are grouped by purpose in `assets/img/builds/`, `assets/img/ideas/`, and `assets/img/profile-matt.png`. Keep page links and asset references relative so the site works from the repository root or a GitHub Pages subpath.

## Build, Test, and Development Commands

There is no install or build command required. For a quick local check, open `index.html` directly in a browser. To test nested paths and relative assets, serve the repository root:

```sh
npx serve .
```

Then open the printed local URL and check pages such as `/`, `/builds/harkster/`, and `/journey/`.

## Coding Style & Naming Conventions

Use semantic HTML and vanilla CSS/JavaScript. Match the existing two-space indentation in HTML and keep attributes readable across multiple lines when they become long. CSS should use the existing custom properties in `:root` before adding new colors, spacing, or font values. Class names follow a BEM-like pattern such as `site-header__inner` and state classes such as `is-active`. Use lowercase kebab-case for directories, page slugs, and image filenames.

## Testing Guidelines

No automated test framework is configured. Validate changes manually in a browser at desktop and mobile widths. Check navigation, image loading, focus states, responsive layout, and nested-page asset paths. For content changes, confirm metadata such as `<title>`, descriptions, and social tags still match the page.

## Commit & Pull Request Guidelines

The available local history does not show a project-specific commit convention. Use short, imperative commit messages, for example `Update journey timeline copy` or `Add build detail image`. Pull requests should describe the user-facing change, list manually tested pages and viewport sizes, and include screenshots for visual changes. Link related issues when applicable.

## Security & Configuration Tips

Do not add secrets, analytics keys, or private data to this public static site. Avoid introducing runtime dependencies unless they are necessary and documented in `README.md`.
