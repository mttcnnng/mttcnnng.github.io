const origin = "https://mttcnnng.com";

export function publicTitle(title) {
  if (!title.endsWith(" | Matt")) return title;
  const name = title.slice(0, -" | Matt".length);
  const full = `${name} | Matt Canning`;
  return full.length <= 52 ? full : name;
}

export function socialImage(page) {
  const isMp3 = page.id === "builds/mp3-home-player";
  return {
    url: `${origin}/assets/img/${isMp3 ? "builds/mp3-home-player-social.jpg" : "social-matt-canning.jpg"}`,
    alt: isMp3 ? "Original MP3 Home Player hardware and Matt Canning" : "Matt Canning — MTTCNNNG",
    width: 1200,
    height: 630,
    type: "image/jpeg",
  };
}
