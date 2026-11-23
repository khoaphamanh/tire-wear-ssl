// Results: dumbbell of the test error per method (best configuration each),
// with the no-skill reference as its own row, sorted by the total test error.
import { $, fmt, fmtPM, tokens, layout, draw, METHODS } from "./ui.js";

function rows(summary, t, narrow) {
  const tag = (text) => ` <span style="color:${t.muted}">· ${text}</span>`;
  return summary.ranking
    .map((g) => {
      const noSkill = g.block === "no_skill";
      const m = METHODS[g.approach];
      return {
        name: noSkill ? "No-skill" : m.name,
        label: noSkill ? `<span style="color:${t.ink2}">No-skill</span>${narrow ? "" : tag("predict the mean")}` : `${m.name}${tag(m.kind)}`,
        cells: g.stages[0].cells,
        noSkill,
      };
    })
    .sort((a, b) => a.cells[3][0] - b.cells[3][0]);
}

function render(summary) {
  const t = tokens();
  const node = $("#chart-results");
  const narrow = node.clientWidth < 560;
  const data = rows(summary, t, narrow);
  const labels = data.map((r) => r.label);
  const opacity = data.map((r) => (r.noSkill ? 0.6 : 1));

  const series = [
    { col: 1, name: "Test SC", color: t.sc, symbol: "circle", size: 12 },
    { col: 2, name: "Test LC", color: t.lc, symbol: "circle", size: 12 },
    { col: 3, name: "Test total", color: t.ink, symbol: "diamond", size: 13 },
  ];
  const connector = {
    type: "scatter",
    mode: "lines",
    x: data.flatMap((r) => [r.cells[1][0], r.cells[2][0], null]),
    y: data.flatMap((r) => [r.label, r.label, null]),
    line: { color: t.axis, width: 3 },
    hoverinfo: "skip",
  };
  const markers = series.map((s) => ({
    type: "scatter",
    mode: "markers",
    name: s.name,
    x: data.map((r) => r.cells[s.col][0]),
    y: labels,
    customdata: data.map((r) => [fmtPM(r.cells[s.col]), r.name]),
    marker: { symbol: s.symbol, size: s.size, color: s.color, opacity, line: { color: t.surface, width: 2 } },
    hovertemplate: `<b>%{customdata[0]} mm</b><br>${s.name} · %{customdata[1]}<extra></extra>`,
  }));
  // direct label: the total error, right of each row's last marker
  const totals = {
    type: "scatter",
    mode: "text",
    x: data.map((r) => Math.max(r.cells[1][0], r.cells[2][0], r.cells[3][0]) + 0.05),
    y: labels,
    text: data.map((r) => `${fmt(r.cells[3][0])} mm`),
    textposition: "middle right",
    textfont: { size: 12.5, color: t.ink2 },
    hoverinfo: "skip",
    cliponaxis: false,
  };

  const xmax = Math.max(...data.flatMap((r) => [r.cells[1][0], r.cells[2][0]]));
  // on phones the value labels do not fit; hover still shows every value
  draw(
    node,
    narrow ? [connector, ...markers] : [connector, ...markers, totals],
    layout(t, {
      height: 70 + data.length * (narrow ? 42 : 46),
      margin: { t: 8, r: 8 },
      xaxis: {
        title: { text: "Mean absolute error (mm)" },
        range: [0, Math.ceil((xmax + (narrow ? 0.1 : 0.4)) * 10) / 10],
        dtick: 0.5,
      },
      yaxis: {
        type: "category",
        categoryorder: "array",
        categoryarray: [...labels].reverse(),
        showgrid: false,
        showline: false,
        tickfont: { color: t.ink, size: narrow ? 12 : 13.5 },
      },
    })
  );
}

export function initResults(summary) {
  const node = $("#chart-results");
  render(summary);
  let narrow = node.clientWidth < 560;
  // the label layout switches at 560 px
  new ResizeObserver(() => {
    if (node.clientWidth < 560 !== narrow) {
      narrow = !narrow;
      render(summary);
    }
  }).observe(node);
}
