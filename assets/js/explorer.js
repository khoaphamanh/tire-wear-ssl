// Prediction explorer: two methods side by side (best configuration each),
// run-level scatter on equal axes, and the window-level predictions of a
// selected test run.
import { $, el, fmt, getJSON, fillSelect, segmented, tokens, layout, draw, mean, showError, METHODS, isSSL } from "./ui.js";

const CAT_NAME = { SC: "SystemCheck", LC: "LaneChange" };

// deterministic horizontal spread so runs at one wear level stay visible
const jitter = (run) => ((((run * 0.6180339887) % 1) + 1) % 1 - 0.5) * 0.08;

function predictions(data, split, seed) {
  const d = data[split];
  const nRuns = d.run.length;
  const index = seed === "all" ? null : data.seeds.indexOf(Number(seed));
  const pred = [];
  for (let i = 0; i < nRuns; i++) {
    pred.push(index == null ? mean(d.y_pred.map((s) => s[i])) : d.y_pred[index][i]);
  }
  // MAE per trajectory: per-seed MAE, then the mean over seeds (thesis convention)
  const maeOf = (p, mask) => {
    const idx = [...Array(nRuns).keys()].filter(mask);
    return idx.length ? mean(idx.map((i) => Math.abs(p[i] - d.y_true[i]))) : null;
  };
  const masks = { total: () => true, SC: (i) => d.category[i] === "SC", LC: (i) => d.category[i] === "LC" };
  const mae = {};
  for (const [k, m] of Object.entries(masks)) {
    if (index == null) {
      const per = d.y_pred.map((p) => maeOf(p, m)).filter((v) => v != null);
      mae[k] = per.length ? mean(per) : null;
    } else {
      mae[k] = maeOf(pred, m);
    }
  }
  return { pred, mae, d };
}

export function initExplorer(summary) {
  // approach -> stage id of its best configuration
  const stageOf = {};
  for (const g of summary.ranking) if (g.approach && g.stages[0].id) stageOf[g.approach] = g.stages[0].id;
  const order = Object.keys(METHODS).filter((k) => stageOf[k]);
  const byTotal = (k) => summary.ranking.find((g) => g.approach === k).stages[0].cells[3][0];
  const bestOf = (ssl) => order.filter((k) => isSSL(k) === ssl).sort((a, b) => byTotal(a) - byTotal(b))[0];

  const state = { split: "test", seed: "all", panels: { A: bestOf(true), B: bestOf(false) }, run: null };
  const loaded = { A: null, B: null };
  const label = (key) => `${METHODS[state.panels[key]].name} (${METHODS[state.panels[key]].kind})`;

  // ---------------------------------------------------------------- controls
  const seeds = [42, 43, 44, 45, 46, 47, 48, 49, 50, 51];
  fillSelect(
    $("#explorer-seed"),
    [{ value: "all", label: "All 10 seeds (mean)" }, ...seeds.map((s) => ({ value: String(s), label: `Seed ${s}` }))],
    "all"
  );
  $("#explorer-seed").addEventListener("change", (e) => {
    state.seed = e.target.value;
    renderAll();
  });
  segmented($("#explorer-split"), "split", (v) => {
    state.split = v;
    renderAll();
  });

  const panelNode = (key) => $(`[data-panel="${key}"]`);
  const options = [
    { group: "SSL · self-supervised", options: order.filter(isSSL).map((k) => ({ value: k, label: METHODS[k].name })) },
    { group: "SL · supervised", options: order.filter((k) => !isSSL(k)).map((k) => ({ value: k, label: METHODS[k].name })) },
  ];
  for (const key of ["A", "B"]) {
    const select = $('[data-role="method"]', panelNode(key));
    fillSelect(select, options, state.panels[key]);
    select.addEventListener("change", (e) => {
      state.panels[key] = e.target.value;
      load(key);
    });
  }

  async function load(key) {
    const node = panelNode(key);
    node.classList.add("loading");
    try {
      loaded[key] = await getJSON(`data/stages/${stageOf[state.panels[key]]}.json`);
      node.classList.remove("loading");
      renderAll();
    } catch (error) {
      node.classList.remove("loading");
      showError($('[data-role="scatter"]', node), error);
    }
  }

  // ---------------------------------------------------------------- rendering
  function renderTiles(key, result) {
    const node = $('[data-role="tiles"]', panelNode(key));
    const tile = (name, value, color, note) =>
      el(
        "div",
        { class: "mini" },
        el("div", { class: "label" }, color ? el("i", { class: "key-dot", style: `background:${color}` }) : el("i", { class: "key-diamond", style: "width:8px;height:8px" }), name),
        el("div", { class: "value num" }, value == null ? "–" : fmt(value), value == null ? null : el("small", {}, " mm")),
        note ? el("div", { class: "tiny" }, note) : null
      );
    node.replaceChildren(
      tile("MAE total", result.mae.total, null),
      tile("MAE SC", result.mae.SC, "var(--sc)"),
      tile("MAE LC", result.mae.LC, "var(--lc)", result.mae.LC == null ? "no LC run in train" : null)
    );
  }

  function axisRange(results) {
    let hi = 3.6;
    for (const r of results) for (const p of r.pred) hi = Math.max(hi, p + 0.15);
    return [-0.25, Math.ceil(hi * 2) / 2];
  }

  function renderScatter(key, result, range) {
    const t = tokens();
    const { d, pred } = result;
    const node = $('[data-role="scatter"]', panelNode(key));
    const traces = [];
    for (const cat of ["SC", "LC"]) {
      const idx = d.category.map((c, i) => (c === cat ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) continue;
      const color = cat === "SC" ? t.sc : t.lc;
      traces.push({
        type: "scatter",
        mode: "markers",
        x: idx.map((i) => d.y_true[i] + jitter(d.run[i])),
        y: idx.map((i) => pred[i]),
        customdata: idx.map((i) => [d.run[i], CAT_NAME[cat], fmt(d.y_true[i]), fmt(pred[i]), fmt(Math.abs(pred[i] - d.y_true[i]))]),
        marker: { size: 9, color, line: { color: t.surface, width: 1.5 } },
        hovertemplate: "<b>%{customdata[3]} mm</b> predicted<br>measured %{customdata[2]} mm · error %{customdata[4]} mm<br>%{customdata[1]}<extra></extra>",
      });
    }
    if (state.split === "test" && state.run != null) {
      const i = d.run.indexOf(state.run);
      if (i >= 0) {
        traces.push({
          type: "scatter",
          mode: "markers",
          x: [d.y_true[i] + jitter(d.run[i])],
          y: [pred[i]],
          marker: { size: 20, color: "rgba(0,0,0,0)", line: { color: t.ink, width: 2 } },
          hoverinfo: "skip",
        });
      }
    }
    const size = Math.max(300, Math.min(480, node.clientWidth));
    draw(
      node,
      traces,
      layout(t, {
        height: size,
        margin: { l: 8, r: 8, t: 8, b: 8 },
        shapes: [{ type: "line", x0: range[0], y0: range[0], x1: range[1], y1: range[1], line: { color: t.ink2, width: 1 }, layer: "below" }],
        xaxis: { title: { text: "Measured wear (mm)" }, range, dtick: 0.5, constrain: "domain" },
        yaxis: { title: { text: "Predicted wear (mm)" }, range, dtick: 0.5, scaleanchor: "x", scaleratio: 1, constrain: "domain" },
      })
    ).then(() => {
      if (!node._clickBound) {
        node._clickBound = true;
        node.on("plotly_click", (ev) => {
          const pt = ev.points && ev.points[0];
          if (!pt || !pt.customdata || state.split !== "test") return;
          state.run = pt.customdata[0];
          renderAll();
        });
      }
    });
  }

  function renderRunDetail() {
    const t = tokens();
    const keys = ["A", "B"].filter((k) => loaded[k]);
    if (!keys.length || state.run == null) return;
    const ref = loaded[keys[0]].test;
    const runIndex = ref.run.indexOf(state.run);
    const truth = ref.y_true[runIndex];
    const color = ref.category[runIndex] === "SC" ? t.sc : t.lc;

    const series = {};
    for (const key of keys) {
      const d = loaded[key].test;
      const windows = d.window_run.map((r, k) => (r === runIndex ? k : -1)).filter((k) => k >= 0);
      const values = windows.map((k) => d.window_pred.map((s) => s[k]));
      const y = state.seed === "all" ? values.map(mean) : values.map((v) => v[loaded[key].seeds.indexOf(Number(state.seed))]);
      series[key] = { y, runPred: mean(y) };
    }
    const all = Object.values(series).flatMap((s) => s.y);
    const lo = Math.min(0, ...all, truth) - 0.1;
    const hi = Math.max(...all, truth) + 0.25;

    for (const key of ["A", "B"]) {
      $(`[data-role="detail-label-${key}"]`).textContent = loaded[key] ? `${key} · ${label(key)}` : key;
      if (!series[key]) continue;
      const s = series[key];
      const x = s.y.map((_, i) => i + 1);
      draw(
        $(`#chart-run-${key}`),
        [
          {
            type: "scatter",
            mode: "lines+markers",
            x,
            y: s.y,
            customdata: s.y.map((v) => fmt(v)),
            line: { color, width: 2 },
            marker: { size: 9, color, line: { color: t.surface, width: 2 } },
            hovertemplate: "<b>%{customdata} mm</b><br>window %{x}<extra></extra>",
          },
        ],
        layout(t, {
          height: 230,
          margin: { t: 6, r: 96 },
          shapes: [
            { type: "line", xref: "paper", x0: 0, x1: 1, y0: truth, y1: truth, line: { color: t.ink2, width: 1.25 } },
            { type: "line", xref: "paper", x0: 0, x1: 1, y0: s.runPred, y1: s.runPred, line: { color, width: 1, dash: "dot" } },
          ],
          annotations: [
            { xref: "paper", x: 1, y: truth, xanchor: "left", text: `measured ${fmt(truth)}`, showarrow: false, font: { size: 11.5, color: t.ink2 } },
            {
              xref: "paper",
              x: 1,
              y: s.runPred,
              xanchor: "left",
              text: `run mean ${fmt(s.runPred)}`,
              showarrow: false,
              font: { size: 11.5, color: t.ink2 },
              yshift: Math.abs(s.runPred - truth) < (hi - lo) * 0.08 ? (s.runPred > truth ? 10 : -10) : 0,
            },
          ],
          xaxis: { title: { text: "Window (5 s each)" }, dtick: 1, range: [0.5, x.length + 0.5] },
          yaxis: { title: { text: "Predicted wear (mm)" }, range: [lo, hi] },
        })
      );
    }
  }

  function renderAll() {
    if (!loaded.A && !loaded.B) return;
    const results = {};
    for (const key of ["A", "B"]) if (loaded[key]) results[key] = predictions(loaded[key], state.split, state.seed);

    // default selection: the test run where the two models disagree most
    if (state.run == null && loaded.A && loaded.B) {
      const a = predictions(loaded.A, "test", "all");
      const b = predictions(loaded.B, "test", "all");
      let best = 0;
      a.pred.forEach((p, i) => {
        if (Math.abs(p - b.pred[i]) > Math.abs(a.pred[best] - b.pred[best])) best = i;
      });
      state.run = a.d.run[best];
    }

    const range = axisRange(Object.values(results));
    for (const key of Object.keys(results)) {
      renderTiles(key, results[key]);
      renderScatter(key, results[key], range);
    }
    $("#explorer-note").textContent =
      (state.seed === "all" ? "Each point is the mean prediction over the 10 seeds. " : `Predictions of seed ${state.seed}. `) +
      "Points are spread ±0.04 mm horizontally so runs at the same wear level stay visible." +
      (state.split === "train" ? " The window-level view below always refers to a test run." : "");
    renderRunDetail();
  }

  load("A");
  load("B");
}
