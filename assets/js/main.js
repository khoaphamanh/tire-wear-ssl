import { $, $$, getJSON, showError } from "./ui.js";
import { initHero, initData } from "./overview.js";
import { initMethods } from "./methods.js";
import { initResults } from "./results.js";
import { initExplorer } from "./explorer.js";

function highlightNav() {
  const links = new Map($$(".nav a").map((a) => [a.getAttribute("href").slice(1), a]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const a of links.values()) a.classList.remove("active");
        links.get(e.target.id)?.classList.add("active");
      }
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  for (const id of links.keys()) {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  }
}

async function main() {
  highlightNav();
  // the diagram needs no data
  try {
    initMethods();
  } catch (error) {
    showError($("#pipeline"), error);
  }
  let summary;
  try {
    summary = await getJSON("data/summary.json");
  } catch (error) {
    showError($("#hero-stats"), error);
    return;
  }
  const sections = [
    ["#hero-stats", initHero],
    ["#data .split-matrix", initData],
    ["#chart-results", initResults],
    ["#explorer .panels", initExplorer],
  ];
  for (const [target, init] of sections) {
    try {
      init(summary);
    } catch (error) {
      showError($(target), error);
    }
  }
}

main();
