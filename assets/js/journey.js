const journeyChapters = document.querySelectorAll("[data-journey-chapter]");

if (journeyChapters.length) {
  document.documentElement.classList.add("journey-enhanced");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -18%", threshold: 0.08 },
    );

    for (const chapter of journeyChapters) observer.observe(chapter);
  } else {
    for (const chapter of journeyChapters) chapter.classList.add("is-revealed");
  }
}
