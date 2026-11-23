// Hero figures, TL;DR numbers and the run counts of the data section.
import { $, el, fmt, METHODS, isSSL } from "./ui.js";

function valueWithUnit(node, value, unit = "mm") {
  node.replaceChildren(document.createTextNode(value), el("small", {}, ` ${unit}`));
}

// test MAE columns of a ranking cell list: 1 = SC, 2 = LC, 3 = total
const total = (g) => g.stages[0].cells[3][0];
const lc = (g) => g.stages[0].cells[2][0];

export function initHero(summary) {
  const ranked = summary.ranking.filter((g) => g.block !== "no_skill");
  const noSkill = summary.ranking.find((g) => g.block === "no_skill");
  const bestSSL = ranked.filter((g) => isSSL(g.approach)).sort((a, b) => total(a) - total(b))[0];
  const bestSL = ranked.filter((g) => !isSSL(g.approach)).sort((a, b) => total(a) - total(b))[0];
  const bestSLonLC = ranked.filter((g) => !isSSL(g.approach)).sort((a, b) => lc(a) - lc(b))[0];

  const gain = Math.round((1 - total(bestSSL) / total(bestSL)) * 100);
  $("#tldr-gain").textContent = `${gain} %`;
  $("#tldr-detail").textContent = `${fmt(total(bestSSL))} mm vs ${fmt(total(bestSL))} mm`;

  valueWithUnit($("#hero-value"), fmt(total(bestSSL)));
  $("#hero-note").textContent = `${METHODS[bestSSL.approach].name}, ${gain} % below the best SL baseline`;

  valueWithUnit($("#hero-baseline"), fmt(total(bestSL)));
  $("#hero-baseline-note").textContent = `${METHODS[bestSL.approach].name}, trained on labels only`;

  valueWithUnit($("#hero-lc"), fmt(lc(bestSSL)));
  $("#hero-lc-note").textContent = `LaneChange, vs ${fmt(lc(bestSLonLC))} mm for the best SL baseline there`;

  valueWithUnit($("#hero-noskill"), fmt(total(noSkill)));
}

export function initData(summary) {
  const facts = summary.dataset;
  if (!facts) return;
  $("#n-train-sc").textContent = String(facts.train.SC);
  $("#n-test-sc").textContent = String(facts.test.SC);
  $("#n-test-lc").textContent = String(facts.test.LC);
}
