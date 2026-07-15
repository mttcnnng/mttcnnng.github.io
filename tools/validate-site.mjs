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
  let target = cleanPath ? resolve(dirname(file), cleanPath) : file;

  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
  return { target, hash };
}

const pages = collectPages(root).sort();

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const label = relative(root, file).split(sep).join("/");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  const expectedCanonical = `https://mttcnnng.github.io${pageUrl(file)}`;

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
}

if (failures.length) {
  console.error(`Site validation failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Site validation passed for ${pages.length} pages.`);
  console.log("Metadata, headings, images, local references and external-link safety are consistent.");
}
