import { createHash } from "node:crypto";

function prose(html, pattern) {
  const section = html.match(pattern)?.[0];
  if (!section) throw new Error("Legacy introduction or narrative is missing");
  return section.replace(/<[^>]+>/g, " ")
    .replace(/&(?:rsquo|lsquo);/g, "'").replace(/&amp;/g, "&")
    .replace(/&(?:ndash|mdash);/g, "–").replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}

export function legacyProseDigest(html) {
  const intro = prose(html, /<section class="project-intro"[\s\S]*?<\/section>/);
  const narrative = prose(html, /<div class="project-narrative"[\s\S]*?<\/div>/);
  return createHash("sha256").update(`${intro}\n${narrative}`).digest("hex");
}
