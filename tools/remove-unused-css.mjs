// Final Gate E cleanup: remove only class selectors absent from generated pages,
// authoring templates/content, and browser scripts (including dynamic states).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cssFile = join(root, "assets/css/styles.css");
const css = readFileSync(cssFile, "utf8");
const sources = [];

function collect(directory, allowed) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path, allowed);
    else if (allowed.test(entry.name)) sources.push(readFileSync(path, "utf8"));
  }
}

for (const directory of ["builds", "ideas", "startups", "archive", "workbench", "contact", "notes", "domains-for-sale", "journey", "_authoring/pages", "_authoring/templates", "assets/js"]) {
  collect(join(root, directory), /\.(?:html|mjs|js)$/);
}
sources.push(readFileSync(join(root, "index.html"), "utf8"));
sources.push(readFileSync(join(root, "404.html"), "utf8"));
const corpus = sources.join("\n");
const classes = [...css.matchAll(/(?<![\w-])\.([A-Za-z][\w-]*)/g)].map((match) => match[1]);
const unused = new Set(classes.filter((name) => !new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(corpus)));
const removed = [];

function clean(input) {
  let output = "";
  let cursor = 0;
  while (cursor < input.length) {
    const open = input.indexOf("{", cursor);
    if (open < 0) return output + input.slice(cursor);
    let depth = 1;
    let close = open + 1;
    while (depth && close < input.length) {
      if (input[close] === "{") depth += 1;
      if (input[close] === "}") depth -= 1;
      close += 1;
    }
    if (depth) throw new Error("Unbalanced CSS braces");
    const prelude = input.slice(cursor, open);
    const body = input.slice(open + 1, close - 1);
    if (prelude.trim().startsWith("@media")) {
      output += `${prelude}{${clean(body)}}`;
    } else if (prelude.trim().startsWith("@") || prelude.trim() === ":root") {
      output += `${prelude}{${body}}`;
    } else {
      const selectors = prelude.trim().split(/,\s*(?=[.#a-zA-Z*:[])/);
      const kept = selectors.filter((selector) => {
        const names = [...selector.matchAll(/(?<![\w-])\.([A-Za-z][\w-]*)/g)].map((match) => match[1]);
        const dead = names.some((name) => unused.has(name));
        if (dead) removed.push(selector.trim());
        return !dead;
      });
      if (kept.length) {
        if (kept.length === selectors.length) {
          output += `${prelude}{${body}}`;
        } else {
          const prefix = prelude.match(/^\s*/)?.[0] ?? "";
          const newline = prelude.includes("\r\n") ? "\r\n" : "\n";
          const indent = prefix.match(/[^\r\n]*$/)?.[0] ?? "";
          output += `${prefix}${kept.map((selector) => selector.trim()).join("," + newline + indent)} {${body}}`;
        }
      }
    }
    cursor = close;
  }
  return output;
}

const cleaned = clean(css).replace(/\n{3,}/g, "\n\n");
if (!removed.length) {
  console.log("No unused selectors found in the current generated and authored pages or runtime scripts.");
  process.exit(0);
}
writeFileSync(cssFile, cleaned);
console.log(`Removed ${removed.length} unused selectors (${new Set(removed).size} distinct); CSS ${css.length} → ${cleaned.length} bytes.`);
console.log(`Unused class names: ${[...unused].sort().join(", ")}`);
