// Shared public shell for legacy and editorial pages.
import { publicTitle, socialImage } from "./metadata.mjs";

function lineEnding(page) {
  return page.newline === "crlf" ? "\r\n" : "\n";
}

function joinLines(page, lines) {
  return lines.join(lineEnding(page));
}

export function renderHead(page, headTemplate) {
  const social = socialImage(page);
  const overrides = {
    ogImage: social.url,
    ogImageAlt: social.alt,
    ogImageWidth: social.width,
    ogImageHeight: social.height,
    ogImageType: social.type,
    twitterImage: social.url,
    twitterImageAlt: social.alt,
  };
  return headTemplate.replace(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g, (token, key) => {
    if (key === "title" || key === "ogTitle" || key === "twitterTitle") return publicTitle(page.head.title);
    if (Object.hasOwn(overrides, key)) return overrides[key];
    if (!Object.hasOwn(page.head, key)) throw new Error(`${page.path}: unknown head field ${key}`);
    return page.head[key];
  });
}

export function renderHeader(page, hasPublishedNotes = false) {
  const root = page.root;
  const homeHref = root || "./";
  const links = [
    ["journey", "Journey", `${root}journey/`],
    ["workbench", "Workbench", `${root}workbench/`],
    ["archive", "Archive", `${root}archive/`],
    ...(hasPublishedNotes ? [["notes", "Notes", `${root}notes/`]] : []),
    ["contact", "Contact", `${root}contact/`],
  ];
  const archiveSection = ["build", "startup", "idea"].includes(page.kind);
  const navState = (kind, href) => {
    const active = page.kind === kind || (kind === "archive" && archiveSection);
    if (!active) return "";
    const destination = new URL(href, `https://mttcnnng.com/${page.path.slice(1)}`).pathname;
    return destination === page.path ? ' aria-current="page"' : ' aria-current="location"';
  };

  return joinLines(page, [
    '    <header class="site-header" aria-label="Site header">',
    '      <div class="page-shell site-header__inner">',
    `        <a class="wordmark" href="${homeHref}" aria-label="Matt Canning — MTTCNNNG home">MTTCNNNG</a>`,
    '        <nav class="site-nav" aria-label="Primary navigation">',
    ...links.map(([kind, label, href]) => `          <a class="site-nav__link${page.kind === kind || kind === "archive" && archiveSection ? " is-active" : ""}" href="${href}"${navState(kind, href)}>${label}</a>`),
    '        </nav>',
    '      </div>',
    '    </header>',
  ]);
}

export function renderFooter(page) {
  const footerClass = page.kind === "journey" ? "site-footer site-footer--journey" : "site-footer";

  return joinLines(page, [
    `    <footer class="${footerClass}">`,
    '      <div class="page-shell site-footer__inner">',
    '        <p>&copy; <span data-current-year>2026</span> mttcnnng.com. All rights reserved.</p>',
    '        <nav class="footer-links" aria-label="Footer links">',
    '          <a href="https://x.com/mttcnnng" rel="me">X</a>',
    '          <a href="https://www.linkedin.com/in/mttcnnng" rel="me">LinkedIn</a>',
    '          <a href="https://github.com/mttcnnng" rel="me">GitHub</a>',
    '        </nav>',
    '      </div>',
    '    </footer>',
  ]);
}

export function renderPage(page, headTemplate, mainHtml, hasPublishedNotes = false) {
  return page.layout.prefix
    + renderHead(page, headTemplate)
    + page.layout.beforeHeader
    + renderHeader(page, hasPublishedNotes)
    + page.layout.betweenHeaderAndMain
    + mainHtml
    + page.layout.betweenMainAndFooter
    + renderFooter(page)
    + page.layout.suffix;
}
