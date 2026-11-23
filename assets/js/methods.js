// Methods: the training pipeline of SSL and SL, drawn as an SVG after the
// thesis figure (data -> encoder -> loss, backbone handed to fine-tuning),
// plus a short explanation of each method's loss.
import { $, el, segmented } from "./ui.js";

const NS = "http://www.w3.org/2000/svg";

// ------------------------------------------------------------------ content
// Rich text: a string, or an array of strings and {i}/{sub} segments.
const f_theta = [{ i: "f" }, { sub: "θ" }];
const r_psi = [{ i: "r" }, { sub: "ψ" }];
const L = (sub) => [{ i: "L" }, { sub }];

const STAGE2_SSL = [
  { kind: "data", title: "labeled data", sub: ["wear in mm"] },
  { kind: "model", title: "encoder", sub: [f_theta, "frozen or fine-tuned"], encoder: true },
  { kind: "model", title: "regression head", sub: [r_psi] },
  { kind: "model", title: "MSE loss", sub: ["predicted vs measured"] },
  { kind: "key", title: "predicted wear", sub: ["MAE on test runs"] },
];

const PIPELINES = {
  tfc: {
    stage1: [
      { kind: "data", title: "unlabeled data", sub: ["time + frequency views"] },
      { kind: "model", title: "encoder", sub: [f_theta, "time + frequency branch"] },
      { kind: "model", title: "contrastive loss", sub: [L("TFC")] },
      { kind: "key", title: "backbone", sub: ["pretrained weights"], backbone: true },
    ],
    stage2: STAGE2_SSL,
  },
  ts2vec: {
    stage1: [
      { kind: "data", title: "unlabeled data", sub: ["two overlapping crops"] },
      { kind: "model", title: "encoder", sub: [f_theta, "one vector per time step"] },
      { kind: "model", title: "contrastive loss", sub: [L("hier")] },
      { kind: "key", title: "backbone", sub: ["pretrained weights"], backbone: true },
    ],
    stage2: STAGE2_SSL,
  },
  inception: {
    stage2: [
      { kind: "data", title: "labeled data", sub: ["wear in mm"] },
      { kind: "model", title: "InceptionTime", sub: [f_theta, "random initialization"] },
      { kind: "model", title: "regression head", sub: [r_psi] },
      { kind: "model", title: "MSE loss", sub: ["predicted vs measured"] },
      { kind: "key", title: "predicted wear", sub: ["MAE on test runs"] },
    ],
  },
  rocket_ridge: {
    stage2: [
      { kind: "data", title: "labeled data", sub: ["wear in mm"] },
      { kind: "model", title: "ROCKET features", sub: ["10,000 random kernels", "not trained"] },
      { kind: "model", title: "ridge regression", sub: ["linear model"] },
      { kind: "model", title: "squared error", sub: ["+ L2 penalty"] },
      { kind: "key", title: "predicted wear", sub: ["MAE on test runs"] },
    ],
  },
  rocket_rf: {
    stage2: [
      { kind: "data", title: "labeled data", sub: ["wear in mm"] },
      { kind: "model", title: "ROCKET features", sub: ["10,000 random kernels", "not trained"] },
      { kind: "model", title: "random forest", sub: ["regression trees"] },
      { kind: "model", title: "squared error", sub: ["split criterion"] },
      { kind: "key", title: "predicted wear", sub: ["MAE on test runs"] },
    ],
  },
};

const PARADIGMS = {
  ssl: {
    methods: [
      ["tfc", "TFC"],
      ["ts2vec", "TS2Vec"],
    ],
    stage1: ["Stage 1 · Self-supervised pretraining", "no labels"],
    stage2: ["Stage 2 · Supervised fine-tuning", "with labels"],
  },
  sl: {
    methods: [
      ["inception", "InceptionTime"],
      ["rocket_ridge", "ROCKET + Ridge"],
      ["rocket_rf", "ROCKET + RF"],
    ],
    stage1: ["No pretraining", ""],
    stage2: ["Supervised training", "labels only"],
  },
};

// ------------------------------------------------------------------ loss text
const sym = (base, sub) => el("span", { class: "sym" }, base, sub ? el("sub", {}, sub) : null);
const pos = (text) => el("span", { class: "pair pos" }, text);
const neg = (text) => el("span", { class: "pair neg" }, text);

// one term of a loss; `figure` (the thesis illustration of the term) makes it clickable
function term(symbol, name, figure, ...body) {
  return { symbol, name, figure, body };
}

// grid of loss terms; clicking a term with a figure shows that figure below the grid
function lossTerms(...terms) {
  const panel = el("figure", { class: "loss-figure", id: "loss-figure", hidden: true });
  const cue = (on) => (on ? "Figure shown below" : "Click to show figure");
  const cards = terms.map((t) => {
    const head = el("div", { class: "loss-term-head" }, t.symbol, el("span", { class: "name" }, t.name));
    if (!t.figure) return el("div", { class: "loss-term" }, head, el("p", {}, ...t.body));
    return el(
      "button",
      { type: "button", class: "loss-term clickable", "aria-pressed": "false", "aria-controls": "loss-figure", onclick: () => show(t) },
      head,
      el("p", {}, ...t.body),
      el("span", { class: "loss-term-cue" }, cue(false))
    );
  });

  function show(t) {
    terms.forEach((u, i) => {
      if (!u.figure) return;
      cards[i].setAttribute("aria-pressed", String(u === t));
      cards[i].lastChild.textContent = cue(u === t);
    });
    panel.replaceChildren(
      el("div", { class: `loss-figure-img ${t.figure.shape}` }, el("img", { src: t.figure.src, alt: t.figure.alt, decoding: "async" })),
      el(
        "figcaption",
        {},
        el("span", { class: "loss-figure-title" }, t.symbol.cloneNode(true), ` · ${t.name} loss. `),
        t.figure.caption
      )
    );
    panel.hidden = false;
  }

  // the first illustrated term is open from the start
  const first = terms.find((t) => t.figure);
  if (first) show(first);
  return [el("div", { class: "loss-terms" }, ...cards), panel];
}

// illustrations from the thesis (synthetic signals), one per contrastive term
const FIG = {
  time: {
    src: "assets/img/tfc_time_branches.svg",
    shape: "tall",
    alt: "Two time-domain windows and their augmented copies pass through the time encoder; arcs mark the positive pair of each window and the negative pairs between windows.",
    caption:
      "A batch of two windows (blue: window 1, red: window 2). Each window and its augmented copy pass through the shared time encoder. " +
      "A colored arc (≈) marks the positive pair of a window and its augmentation, a black arc (≠) a negative pair of views of different windows.",
  },
  freq: {
    src: "assets/img/tfc_freq_branches.svg",
    shape: "tall",
    alt: "Two spectra and their augmented copies pass through the frequency encoder; arcs mark the positive pair of each spectrum and the negative pairs between windows.",
    caption:
      "The same structure in the frequency domain: each spectrum and its augmented copy pass through the shared frequency encoder. " +
      "A colored arc (≈) marks a positive pair, a black arc (≠) a negative pair of views of different windows.",
  },
  cross: {
    src: "assets/img/tfc_cross_branches.svg",
    shape: "tall",
    alt: "Time and frequency view of two windows, each passed through its encoder and projection head; arcs mark the time-frequency positive pair of each window.",
    caption:
      "Each window is encoded in its time view and its frequency view, each through its own encoder and projection head. " +
      "The time and the frequency embedding of the same window form the positive pair (≈); views of different windows are negatives (≠).",
  },
  temp: {
    src: "assets/img/ts2vec_temporal_loss.svg",
    shape: "wide",
    alt: "One window cropped into two overlapping segments; the anchor time step of segment 1 is positive with the same time step of segment 2 and negative with all other time steps.",
    caption:
      "Reduced to a single anchor. One window is cropped into two overlapping segments (blue and red), and the encoder gives one representation per time step of the overlap. " +
      "The anchor (dashed) is positive with the same time step of the other segment (green =) and negative with every other time step, in either segment (≠).",
  },
  inst: {
    src: "assets/img/ts2vec_instance_loss.svg",
    shape: "wide",
    alt: "Two windows of a batch, each cropped into two segments; the anchor is positive with the same time step of its own second segment and negative with the same time step of the other window.",
    caption:
      "Reduced to a single anchor. Two windows of the same batch are each cropped into two overlapping segments. The anchor (dashed) is positive with the same " +
      "time step of the other segment of its own window (green =) and negative with the same time step in either segment of the other window (≠).",
  },
};

const LOSSES = {
  tfc: () => [
    el("h3", {}, "TFC · Time-Frequency Consistency"),
    el(
      "p",
      {},
      "Each window is encoded twice: as the raw signal (time domain) and as its spectrum (frequency domain). " +
        "All three terms are contrastive: they pull a positive pair together and push the other windows of the batch apart."
    ),
    ...lossTerms(
      term(sym("L", "T"), "time", FIG.time, pos("Positive pair:"), " a window and its augmented copy (jitter, scaling, masking)."),
      term(sym("L", "F"), "frequency", FIG.freq, pos("Positive pair:"), " a spectrum and its augmented copy (frequency components removed or added)."),
      term(sym("L", "TF"), "consistency", FIG.cross, pos("Positive pair:"), " the time and the frequency embedding of the same window.")
    ),
    el(
      "div",
      { class: "loss-formula" },
      sym("L", "TFC"),
      " = λ (",
      sym("L", "T"),
      " + ",
      sym("L", "F"),
      ") + (1 − λ) ",
      sym("L", "TF"),
      el("span", { class: "note" }, "λ = 0.5")
    ),
  ],
  ts2vec: () => [
    el("h3", {}, "TS2Vec"),
    el(
      "p",
      {},
      "Two random crops of the same window overlap in time. At every time step of the overlap, both crops must give the same " +
        "representation, although each crop sees a different context."
    ),
    ...lossTerms(
      term(sym("L", "temp"), "temporal", FIG.temp, pos("Positive:"), " the same time step in both crops. ", neg("Negatives:"), " the other time steps of the same window."),
      term(sym("L", "inst"), "instance-wise", FIG.inst, pos("Positive:"), " the same time step in both crops. ", neg("Negatives:"), " the same time step in the other windows of the batch."),
      term(sym("L", "hier"), "hierarchical", null, "Both terms are repeated after max pooling over time, from single time steps up to the whole window, and averaged.")
    ),
    el(
      "div",
      { class: "loss-formula" },
      sym("L", "dual"),
      " = α ",
      sym("L", "inst"),
      " + (1 − α) ",
      sym("L", "temp"),
      el("span", { class: "note" }, "α = 0.5, averaged over all pooling levels")
    ),
  ],
  inception: () => [
    el("h3", {}, "InceptionTime"),
    el(
      "p",
      {},
      "A convolutional network with parallel kernels of several lengths, trained end-to-end from random weights on the labeled windows. " +
        "Its loss is the mean squared error between predicted and measured wear; the unlabeled data plays no part."
    ),
  ],
  rocket_ridge: () => [
    el("h3", {}, "ROCKET + Ridge"),
    el(
      "p",
      {},
      "ROCKET turns every window into a fixed feature vector with 10,000 random, untrained convolution kernels. A ridge regression " +
        "maps the features to wear by minimizing the squared error plus an L2 penalty on its weights."
    ),
  ],
  rocket_rf: () => [
    el("h3", {}, "ROCKET + Random Forest"),
    el(
      "p",
      {},
      "The same random-kernel features, regressed with a random forest: an average of regression trees whose splits are chosen " +
        "to reduce the squared error."
    ),
  ],
};

// ------------------------------------------------------------------ SVG helpers
function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) node.setAttribute(k, v);
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

// one line of rich text as tspans; subscripts shift down and back up
function richLine(textNode, content) {
  const parts = typeof content === "string" ? [content] : content;
  let shifted = false;
  for (const p of parts) {
    const t = svg("tspan");
    if (typeof p === "string") {
      t.textContent = p;
      if (shifted) {
        t.setAttribute("dy", "-0.3em");
        shifted = false;
      }
    } else if (p.i) {
      t.textContent = p.i;
      t.setAttribute("class", "pl-italic");
      t.setAttribute("font-family", 'Georgia, "Times New Roman", serif');
      if (shifted) {
        t.setAttribute("dy", "-0.3em");
        shifted = false;
      }
    } else if (p.sub) {
      t.textContent = p.sub;
      t.setAttribute("dy", "0.3em");
      t.setAttribute("font-size", "0.78em");
      shifted = true;
    }
    textNode.append(t);
  }
}

const TITLE_H = 18;
const SUB_H = 17;
const boxHeight = (lines) => 22 + TITLE_H + SUB_H * lines;

function box(spec, x, y, w, h) {
  const cls = { data: "pl-box", model: "pl-model", key: "pl-key", ghost: "pl-ghost" }[spec.kind];
  const g = svg("g");
  g.append(svg("rect", { x, y, width: w, height: h, rx: 7, class: cls }));
  const lines = spec.sub || [];
  const block = TITLE_H + SUB_H * lines.length;
  let baseline = y + (h - block) / 2 + 13.5;
  const title = svg("text", { x: x + w / 2, y: baseline, "text-anchor": "middle", class: spec.kind === "ghost" ? "pl-ghost-text" : "pl-title" });
  richLine(title, spec.title);
  g.append(title);
  lines.forEach((line, i) => {
    baseline += i === 0 ? TITLE_H : SUB_H;
    // a line of math (array) is set larger, like the symbols of the thesis figure
    const cls = spec.kind === "ghost" ? "pl-ghost-text" : Array.isArray(line) ? "pl-math" : "pl-sub";
    const t = svg("text", { x: x + w / 2, y: baseline, "text-anchor": "middle", class: cls });
    richLine(t, line);
    g.append(t);
  });
  g.dataset.width = String(w);
  return g;
}

function arrow(x1, y1, x2, y2, dashed = false) {
  return svg("path", {
    d: `M ${x1} ${y1} L ${x2} ${y2}`,
    class: dashed ? "pl-dash" : "pl-arrow",
    "marker-end": dashed ? "url(#pl-ah-dash)" : "url(#pl-ah)",
  });
}

// stage title with its note beside it, or below it when space is short
function stageHeader(x, y, [title, note], stacked = false) {
  const t = svg("text", { x, y });
  t.append(svg("tspan", { class: "pl-stage" }, document.createTextNode(title)));
  if (note) {
    const pos = stacked ? { x, dy: "1.35em" } : { dx: "10" };
    t.append(svg("tspan", { class: "pl-stage-note", ...pos }, document.createTextNode(`(${note})`)));
  }
  return t;
}

function defs() {
  const head = (id, cls) =>
    svg("marker", { id, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "8", markerHeight: "8", orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, svg("path", { d: "M 0 0 L 10 5 L 0 10 z", class: cls }));
  return svg("defs", {}, head("pl-ah", "pl-head-arrow"), head("pl-ah-dash", "pl-head-dash"));
}

// shrink any text line that would overflow its box
function fitText(root) {
  for (const g of root.querySelectorAll("g[data-width]")) {
    const avail = Number(g.dataset.width) - 14;
    for (const t of g.querySelectorAll("text")) {
      const len = t.getComputedTextLength();
      if (len > avail) {
        const size = parseFloat(getComputedStyle(t).fontSize);
        t.style.fontSize = `${Math.max(10, (size * avail) / len).toFixed(1)}px`;
      }
    }
  }
}

// ------------------------------------------------------------------ layouts
function maxLines(specs) {
  return Math.max(...specs.map((s) => (s.sub || []).length));
}

function horizontal(W, paradigm, pipe) {
  const gap = 34;
  const cw = (W - 4 * gap) / 5;
  const col = (i) => i * (cw + gap);
  const nodes = [defs()];
  const stage1 = pipe.stage1;
  const h1 = stage1 ? boxHeight(maxLines(stage1)) : boxHeight(1);
  const h2 = boxHeight(maxLines(pipe.stage2));
  const y1 = 30;
  const y2 = y1 + h1 + 72;

  nodes.push(stageHeader(0, 17, PARADIGMS[paradigm].stage1));
  if (stage1) {
    // four boxes across the full width, backbone above the last column
    const gap1 = (W - 4 * cw) / 3;
    const x1 = (i) => i * (cw + gap1);
    stage1.forEach((s, i) => {
      nodes.push(box(s, x1(i), y1, cw, h1));
      if (i) nodes.push(arrow(x1(i - 1) + cw, y1 + h1 / 2, x1(i) - 2, y1 + h1 / 2));
    });
    // dashed hand-over: backbone -> fine-tuning encoder
    const bx = x1(3) + cw / 2;
    const ex = col(1) + cw / 2;
    const yl = y2 - 16;
    nodes.push(
      svg("path", { d: `M ${bx} ${y1 + h1} L ${bx} ${yl} L ${ex} ${yl} L ${ex} ${y2 - 2}`, class: "pl-dash", "marker-end": "url(#pl-ah-dash)" }),
      svg("text", { x: (bx + ex) / 2, y: yl - 8, "text-anchor": "middle", class: "pl-dash-label" }, document.createTextNode("load pretrained weights"))
    );
  } else {
    nodes.push(box({ kind: "ghost", title: "unlabeled data", sub: ["not used"] }, 0, y1, cw, h1));
    nodes.push(
      svg("text", { x: cw + 18, y: y1 + h1 / 2 + 5, class: "pl-ghost-text" }, document.createTextNode("Supervised learning has no way to learn from data without labels."))
    );
  }

  nodes.push(stageHeader(0, y2 - 30, PARADIGMS[paradigm].stage2));
  pipe.stage2.forEach((s, i) => {
    nodes.push(box(s, col(i), y2, cw, h2));
    if (i) nodes.push(arrow(col(i - 1) + cw, y2 + h2 / 2, col(i) - 2, y2 + h2 / 2));
  });
  return { height: y2 + h2 + 4, nodes };
}

function vertical(W, paradigm, pipe) {
  const lane = 44;
  const bw = Math.min(W - lane, 440);
  const x0 = Math.max(0, (W - bw - lane) / 2);
  const step = 22;
  const nodes = [defs()];
  let y = 0;
  let backbone = null;
  let encoder = null;

  const column = (specs) => {
    const h = boxHeight(maxLines(specs));
    specs.forEach((s, i) => {
      if (i) {
        nodes.push(arrow(x0 + bw / 2, y - step, x0 + bw / 2, y - 2));
      }
      nodes.push(box(s, x0, y, bw, h));
      if (s.backbone) backbone = y + h / 2;
      if (s.encoder) encoder = y + h / 2;
      y += h + step;
    });
    y -= step;
  };

  const header = (spec) => {
    nodes.push(stageHeader(x0, y + 16, spec, true));
    y += spec[1] ? 46 : 28;
  };
  header(PARADIGMS[paradigm].stage1);
  if (pipe.stage1) column(pipe.stage1);
  else column([{ kind: "ghost", title: "unlabeled data", sub: ["not used: supervised learning", "cannot learn without labels"] }]);
  y += 34;
  header(PARADIGMS[paradigm].stage2);
  column(pipe.stage2);

  if (backbone != null && encoder != null) {
    const xr = x0 + bw;
    const xl = xr + 22;
    nodes.push(
      svg("path", { d: `M ${xr} ${backbone} L ${xl} ${backbone} L ${xl} ${encoder} L ${xr + 2} ${encoder}`, class: "pl-dash", "marker-end": "url(#pl-ah-dash)" }),
      svg(
        "text",
        { x: xl + 14, y: (backbone + encoder) / 2, "text-anchor": "middle", class: "pl-dash-label", transform: `rotate(90 ${xl + 14} ${(backbone + encoder) / 2})` },
        document.createTextNode("load pretrained weights")
      )
    );
  }
  return { height: y + 4, nodes };
}

// ------------------------------------------------------------------ init
export function initMethods() {
  const state = { paradigm: "ssl", method: { ssl: "tfc", sl: "inception" } };
  const container = $("#pipeline");
  const methodGroup = $("#method-switch");
  let lastWidth = 0;
  let lastMethod = null;

  function render(animate = true) {
    const W = Math.floor(container.clientWidth);
    if (!W) return;
    lastWidth = W;
    const method = state.method[state.paradigm];
    const pipe = PIPELINES[method];
    const { height, nodes } = W >= 900 ? horizontal(W, state.paradigm, pipe) : vertical(W, state.paradigm, pipe);
    const root = svg("svg", { viewBox: `0 0 ${W} ${height}`, width: W, height, class: animate ? "fade" : null, "aria-hidden": "true" }, nodes);
    container.replaceChildren(root);
    fitText(root);
    // a resize redraws only the diagram, so the chosen loss figure stays open
    if (method !== lastMethod) {
      lastMethod = method;
      $("#loss-box").replaceChildren(...LOSSES[method]());
    }
  }

  function fillMethods() {
    const current = state.method[state.paradigm];
    methodGroup.replaceChildren(
      ...PARADIGMS[state.paradigm].methods.map(([key, label]) =>
        el("button", { type: "button", "data-method": key, "aria-pressed": String(key === current) }, label)
      )
    );
    segmented(methodGroup, "method", (m) => {
      state.method[state.paradigm] = m;
      render();
    });
  }

  segmented($("#paradigm-switch"), "paradigm", (p) => {
    state.paradigm = p;
    fillMethods();
    render();
  });
  fillMethods();
  render(false);

  new ResizeObserver(() => {
    if (Math.floor(container.clientWidth) !== lastWidth) render(false);
  }).observe(container);
}
