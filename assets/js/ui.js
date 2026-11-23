// Shared helpers: data loading, DOM building, number formatting, Plotly defaults.

// display name and learning paradigm per approach directory
export const METHODS = {
  tfc: { name: "TFC", long: "Time-Frequency Consistency", kind: "SSL" },
  ts2vec: { name: "TS2Vec", long: "TS2Vec", kind: "SSL" },
  inception: { name: "InceptionTime", long: "InceptionTime", kind: "SL" },
  rocket_ridge: { name: "ROCKET + Ridge", long: "ROCKET + Ridge regression", kind: "SL" },
  rocket_rf: { name: "ROCKET + RF", long: "ROCKET + Random Forest", kind: "SL" },
};
export const isSSL = (approach) => METHODS[approach]?.kind === "SSL";

const cache = new Map();

export function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path).then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
        return r.json();
      })
    );
  }
  return cache.get(path);
}

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

// Build an element; text always goes in through text nodes, never innerHTML.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

// Half away from zero, like the thesis tables (0.705 -> 0.71, not 0.70).
export function fmt(v, d = 2) {
  if (v == null || Number.isNaN(v)) return "–";
  return (v + Math.sign(v) * 1e-9).toFixed(d);
}

export function fmtPM(cell, d = 2) {
  if (!cell) return "–";
  const [m, s] = cell;
  return s == null ? fmt(m, d) : `${fmt(m, d)} ± ${fmt(s, d)}`;
}

export const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
// population std, as numpy.std in the training code
export const std = (a) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};

// A .seg group of buttons acting as a single-choice control.
export function segmented(group, attr, onChange) {
  const buttons = $$("button", group);
  const set = (value) => {
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset[attr] === value));
    if (group.getAttribute("role") === "tablist") {
      for (const b of buttons) b.setAttribute("aria-selected", String(b.dataset[attr] === value));
    }
  };
  for (const b of buttons) {
    b.addEventListener("click", () => {
      if (b.disabled) return;
      set(b.dataset[attr]);
      onChange(b.dataset[attr]);
    });
  }
  return set;
}

export function fillSelect(select, options, value) {
  select.replaceChildren();
  for (const o of options) {
    if (o.group) {
      const g = el("optgroup", { label: o.group });
      for (const c of o.options) g.append(el("option", { value: c.value, disabled: c.disabled }, c.label));
      select.append(g);
    } else {
      select.append(el("option", { value: o.value, disabled: o.disabled }, o.label));
    }
  }
  if (value != null) select.value = String(value);
}

export function showError(container, error) {
  console.error(error);
  container.replaceChildren(el("div", { class: "empty" }, `Could not load this view: ${error.message}`));
}

// ------------------------------------------------------------------ tokens

export function tokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  return {
    page: g("--page"),
    surface: g("--surface"),
    ink: g("--ink"),
    ink2: g("--ink-2"),
    muted: g("--muted"),
    grid: g("--grid"),
    axis: g("--axis"),
    sc: g("--sc"),
    lc: g("--lc"),
    accent: g("--accent"),
    accentWash: g("--accent-wash"),
    scWash: g("--sc-wash"),
    lcWash: g("--lc-wash"),
    mutedWash: g("--muted-wash"),
  };
}

// ------------------------------------------------------------------ Plotly

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const PLOT_CONFIG = { displayModeBar: false, responsive: true, scrollZoom: false, doubleClick: false };

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

export function merge(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    out[k] = isObject(v) && isObject(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

export function axis(t, extra = {}) {
  return merge(
    {
      gridcolor: t.grid,
      gridwidth: 1,
      linecolor: t.axis,
      linewidth: 1,
      showline: true,
      zeroline: false,
      ticks: "",
      tickfont: { color: t.muted, size: 11.5 },
      title: { font: { color: t.ink2, size: 12.5 }, standoff: 8 },
      automargin: true,
      fixedrange: true,
    },
    extra
  );
}

export function layout(t, extra = {}) {
  const { xaxis, yaxis, ...rest } = extra;
  return merge(
    {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT, size: 12, color: t.ink2 },
      margin: { l: 8, r: 12, t: 10, b: 8 },
      showlegend: false,
      hovermode: "closest",
      hoverdistance: 24,
      hoverlabel: {
        bgcolor: t.surface,
        bordercolor: t.axis,
        font: { family: FONT, color: t.ink, size: 12.5 },
        align: "left",
      },
      dragmode: false,
      xaxis: axis(t, xaxis),
      yaxis: axis(t, yaxis),
    },
    rest
  );
}

export function draw(node, traces, lay) {
  const placeholder = node.querySelector(":scope > .empty");
  if (placeholder) placeholder.remove();
  return Plotly.react(node, traces, lay, PLOT_CONFIG);
}

export function emptyPlot(node, message) {
  if (window.Plotly) Plotly.purge(node);
  node.replaceChildren(el("div", { class: "empty" }, message));
}
