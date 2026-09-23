import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function collectPages(directory) {
  const pages = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) pages.push(...collectPages(path));
    if (entry.isFile() && entry.name === "index.html") pages.push(path);
  }

  return pages;
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function pageUrl(file) {
  const path = relative(root, file).split(sep).join("/");
  return path === "index.html" ? "/" : `/${path.replace(/index\.html$/, "")}`;
}

function localTarget(file, reference) {
  const [path, hash = ""] = reference.split("#", 2);
  const cleanPath = path.split("?", 1)[0];
  let target = cleanPath ? cleanPath.startsWith("/")
    ? resolve(root, cleanPath.slice(1)) : resolve(dirname(file), cleanPath) : file;

  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
  return { target, hash };
}

const pages = [...collectPages(root), join(root, "404.html")].sort();
const titles = new Map();
const descriptions = new Map();

function meta(html, name, attribute = "name") {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<meta\\s+${attribute}="${escaped}"\\s+content="([^"]*)"`))?.[1];
}

function normalizeEntities(value) {
  return value?.replace(/&lsquo;|&#8216;/g, "‘").replace(/&rsquo;|&#8217;/g, "’");
}

function jpegSize(file) {
  const bytes = readFileSync(file);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  for (let offset = 2; offset + 9 < bytes.length;) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
      return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  return null;
}

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const label = relative(root, file).split(sep).join("/");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  const expectedCanonical = `https://mttcnnng.com${pageUrl(file)}`;
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = meta(html, "description");
  if (!title) failures.push(`${label} is missing a title.`);
  else if (titles.has(title)) failures.push(`${label} repeats the title of ${titles.get(title)}.`);
  else titles.set(title, label);
  if (description && descriptions.has(description)) failures.push(`${label} repeats the description of ${descriptions.get(description)}.`);
  else if (description) descriptions.set(description, label);
  if (normalizeEntities(meta(html, "og:title", "property")) !== normalizeEntities(title)
    || normalizeEntities(meta(html, "twitter:title")) !== normalizeEntities(title)) {
    failures.push(`${label} social titles do not match the document title.`);
  }
  if (meta(html, "og:description", "property") !== description || meta(html, "twitter:description") !== description) {
    failures.push(`${label} social descriptions do not match the meta description.`);
  }
  const expectedSocial = label === "builds/mp3-home-player/index.html"
    ? "https://mttcnnng.com/assets/img/builds/mp3-home-player-social.jpg"
    : "https://mttcnnng.com/assets/img/social-matt-canning.jpg";
  const ogImage = meta(html, "og:image", "property");
  if (ogImage !== expectedSocial || meta(html, "twitter:image") !== expectedSocial) {
    failures.push(`${label} has an unexpected social image.`);
  }
  if (!meta(html, "og:image:alt", "property") || meta(html, "twitter:image:alt") !== meta(html, "og:image:alt", "property")) {
    failures.push(`${label} social image alt metadata is missing or inconsistent.`);
  }
  if (meta(html, "og:image:width", "property") !== "1200" || meta(html, "og:image:height", "property") !== "630" || meta(html, "og:image:type", "property") !== "image/jpeg") {
    failures.push(`${label} social image dimensions or type are incorrect.`);
  }
  if (meta(html, "og:url", "property") !== expectedCanonical) failures.push(`${label} Open Graph URL differs from canonical.`);
  const noindex = meta(html, "robots")?.split(",").some((part) => part.trim() === "noindex") ?? false;
  const shouldNoindex = label === "404.html" || label === "notes/index.html" && /Notes will appear here when published\./.test(html);
  if (noindex !== shouldNoindex) failures.push(`${label} has incorrect indexability.`);

  const requiredPatterns = [
    [/<html\s+lang="en">/, "an English document language"],
    [/<meta\s+name="viewport"/, "a viewport meta tag"],
    [/<meta\s+name="description"\s+content="[^"]+"/, "a meta description"],
    [/<meta\s+name="theme-color"\s+content="#ffffff">/, "the shared theme colour"],
    [/<meta\s+property="og:title"/, "an Open Graph title"],
    [/<meta\s+property="og:description"/, "an Open Graph description"],
    [/<meta\s+property="og:url"/, "an Open Graph URL"],
    [/<meta\s+property="og:image"/, "an Open Graph image"],
    [/<meta\s+property="og:image:alt"/, "Open Graph image alt text"],
    [/<meta\s+name="twitter:card"/, "Twitter card metadata"],
    [/fonts\.googleapis\.com\/css2\?family=Inter:wght@400;500;600;700&family=Space\+Grotesk:wght@500;600;700/, "the shared font request"],
    [/<a\s+class="skip-link"\s+href="#main-content">/, "the shared skip link"],
    [/<main\s+id="main-content"/, "the main content landmark"],
    [/<header\s+class="site-header"/, "the shared site header"],
    [/<footer\s+class="site-footer/, "the shared site footer"],
    [/<script\s+src="[^"]*assets\/js\/main\.js"\s+defer><\/script>/, "the shared deferred script"],
  ];

  for (const [pattern, requirement] of requiredPatterns) {
    if (!pattern.test(html)) failures.push(`${label} is missing ${requirement}.`);
  }

  if (!canonical) {
    failures.push(`${label} is missing a canonical URL.`);
  } else if (canonical[1] !== expectedCanonical) {
    failures.push(`${label} canonical URL is ${canonical[1]}; expected ${expectedCanonical}.`);
  }

  if (count(html, /<h1\b/g) !== 1) failures.push(`${label} must contain exactly one h1.`);
  if (duplicateIds.length) failures.push(`${label} has duplicate ids: ${[...new Set(duplicateIds)].join(", ")}.`);

  const headings = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index] > headings[index - 1] + 1) {
      failures.push(`${label} skips from h${headings[index - 1]} to h${headings[index]}.`);
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    const image = match[0];
    if (!/\salt="[^"]*"/.test(image)) failures.push(`${label} contains an image without alt text.`);
    if (!/\swidth="\d+"/.test(image) || !/\sheight="\d+"/.test(image)) {
      failures.push(`${label} contains an image without stable width and height.`);
    }
    if (!/\sloading="(?:eager|lazy)"/.test(image)) failures.push(`${label} contains an image without a loading strategy.`);
  }

  for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/\srel="[^"]*noopener[^"]*"/.test(match[0])) {
      failures.push(`${label} contains an unsafe target=_blank link.`);
    }
  }

  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|data:)/.test(reference)) continue;

    const { target, hash } = localTarget(file, reference);
    if (!existsSync(target)) {
      failures.push(`${label} local reference ${reference} does not resolve.`);
      continue;
    }

    if (hash && target.endsWith(".html")) {
      const targetHtml = target === file ? html : readFileSync(target, "utf8");
      if (!new RegExp(`\\sid="${hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(targetHtml)) {
        failures.push(`${label} reference ${reference} has no matching target id.`);
      }
    }
  }

  for (const match of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(",")) {
      const reference = candidate.trim().split(/\s+/, 1)[0];
      if (reference && !existsSync(localTarget(file, reference).target)) failures.push(`${label} srcset reference ${reference} does not resolve.`);
    }
  }
}

for (const path of ["assets/img/social-matt-canning.jpg", "assets/img/builds/mp3-home-player-social.jpg"]) {
  const size = jpegSize(join(root, path));
  if (JSON.stringify(size) !== JSON.stringify([1200, 630])) failures.push(`${path} is not a 1200×630 JPEG.`);
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const robots = readFileSync(join(root, "robots.txt"), "utf8");
const config = readFileSync(join(root, "_config.yml"), "utf8");
const cname = readFileSync(join(root, "CNAME"), "utf8").trim();
if (/<lastmod>/.test(sitemap)) failures.push("Sitemap retains an unverified lastmod value.");
if (sitemap.includes("https://mttcnnng.com/404.html")) failures.push("404 appears in the sitemap.");
if (!robots.includes("User-agent: *") || !robots.includes("Allow: /") || !robots.includes("Sitemap: https://mttcnnng.com/sitemap.xml")) {
  failures.push("robots.txt does not retain the production allow policy and sitemap.");
}
if (cname !== "mttcnnng.com") failures.push("CNAME does not match the production origin.");
for (const excluded of ["_authoring", "tools", ".local-editorial"]) {
  if (!config.includes(`  - ${excluded}`)) failures.push(`Publishing config does not exclude ${excluded}.`);
}
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const emptyNotes = readFileSync(join(root, "notes/index.html"), "utf8").includes("Notes will appear here when published.");
if (emptyNotes && sitemap.includes("https://mttcnnng.com/notes/")) failures.push("Empty Notes appears in the sitemap.");
const expectedUrls = pages.filter((file) => {
  const label = relative(root, file).split(sep).join("/");
  return label !== "404.html" && !(label === "notes/index.html" && emptyNotes);
})
  .map((file) => `https://mttcnnng.com${pageUrl(file)}`);
if (sitemapUrls.length !== expectedUrls.length || new Set(sitemapUrls).size !== expectedUrls.length
  || sitemapUrls.some((url) => !expectedUrls.includes(url))) {
  failures.push("Sitemap URLs do not match every indexable generated page exactly once.");
}
for (const route of ["/", "/journey/", "/workbench/", "/archive/", "/contact/"]) {
  if (!sitemap.includes(`<loc>https://mttcnnng.com${route}</loc>`)) failures.push(`${route} is missing from the sitemap.`);
}

if (failures.length) {
  console.error(`Site validation failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Site validation passed for ${pages.length} pages.`);
  console.log("Metadata, headings, social images, indexability, publishing files, local references and external-link safety are consistent.");
}
