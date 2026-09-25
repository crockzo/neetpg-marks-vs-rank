const PAGE_SIZE = 100;

// neetpg-marks.js exposes one flat array, stride 3: [rank, marks2026, marks2025]
// marks2025 is null where that rank has no 2025 counterpart.
const D = window.NEETPG;
const ROWS = D.length / 3;

const filterState = {
  rank: "",
  minRank: "",
  maxRank: "",
  minM26: "",
  maxM26: "",
  minM25: "",
  maxM25: "",
};

const COLUMN_META = {
  rank: { label: "Rank", numeric: true },
  m26: { label: "Marks 2026", numeric: true },
  m25: { label: "Marks 2025", numeric: true },
  delta: { label: "Marks Δ", numeric: true },
};

let sortKey = "rank";
let sortDir = "asc";
let page = 1;
let filtered = []; // row indices into D

const fmt = (n) => n.toLocaleString("en-IN");

function val(row, key) {
  const b = row * 3;
  if (key === "rank") return D[b];
  if (key === "m26") return D[b + 1];
  if (key === "m25") return D[b + 2];
  return D[b + 2] === null ? null : D[b + 1] - D[b + 2];
}

function num(v) {
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ---------- Number inputs ---------- */

function createNumberInput(container, { key, label, placeholder, min, max }) {
  const root = document.createElement("div");
  root.className = "score-input";

  const lbl = document.createElement("label");
  lbl.textContent = label;

  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "numeric";
  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  input.step = "1";
  input.placeholder = placeholder;
  input.value = filterState[key];
  input.addEventListener("input", () => {
    filterState[key] = input.value.trim();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyFilters();
  });

  root.appendChild(lbl);
  root.appendChild(input);
  container.appendChild(root);
  return input;
}

/* ---------- Filtering / sorting ---------- */

function applyFilters() {
  page = 1;
  const exact = num(filterState.rank);
  const minRank = num(filterState.minRank);
  const maxRank = num(filterState.maxRank);
  const minM26 = num(filterState.minM26);
  const maxM26 = num(filterState.maxM26);
  const minM25 = num(filterState.minM25);
  const maxM25 = num(filterState.maxM25);
  const m25Active = minM25 !== null || maxM25 !== null;

  const out = [];
  for (let row = 0; row < ROWS; row++) {
    const b = row * 3;
    const rank = D[b];
    const m26 = D[b + 1];
    const m25 = D[b + 2];

    if (exact !== null && rank !== exact) continue;
    if (minRank !== null && rank < minRank) continue;
    if (maxRank !== null && rank > maxRank) continue;
    if (minM26 !== null && m26 < minM26) continue;
    if (maxM26 !== null && m26 > maxM26) continue;

    if (m25 === null) {
      // a blank 2025 mark can never satisfy a 2025 range filter
      if (m25Active) continue;
    } else {
      if (minM25 !== null && m25 < minM25) continue;
      if (maxM25 !== null && m25 > maxM25) continue;
    }

    out.push(row);
  }

  filtered = out;
  sortRows();
  render();
}

function sortRows() {
  const key = sortKey;
  const dir = sortDir === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    const va = val(a, key);
    const vb = val(b, key);
    // rows with no 2025 mark (and therefore no delta) always sort last
    if (va === null) return vb === null ? 0 : 1;
    if (vb === null) return -1;
    return (va - vb) * dir;
  });
}

/* ---------- Render ---------- */

function render() {
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.min(page, totalPages);

  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);

  const body = document.getElementById("table-body");

  if (total === 0) {
    body.innerHTML = '<tr><td colspan="4" class="empty-cell">No ranks match your current filters.</td></tr>';
  } else {
    let html = "";
    for (let i = start; i < end; i++) {
      const b = filtered[i] * 3;
      const rank = D[b];
      const m26 = D[b + 1];
      const m25 = D[b + 2];
      let delta = '<td class="col-delta delta-same">&mdash;</td>';
      if (m25 !== null) {
        const d = m26 - m25;
        const cls = d > 0 ? "delta-up" : d < 0 ? "delta-down" : "delta-same";
        delta = `<td class="col-delta ${cls}">${d > 0 ? "+" : ""}${d}</td>`;
      }
      html +=
        '<tr>' +
        `<td class="col-rank">${fmt(rank)}</td>` +
        `<td class="col-score">${m26}</td>` +
        (m25 === null
          ? '<td class="col-score col-empty">&mdash;</td>'
          : `<td class="col-score">${m25}</td>`) +
        delta +
        "</tr>";
    }
    body.innerHTML = html;
  }

  const countEl = document.getElementById("result-count");
  if (total === 0) {
    countEl.innerHTML = "<strong>0</strong> ranks match your filters.";
  } else {
    countEl.innerHTML =
      `Showing <strong>${fmt(start + 1)}&ndash;${fmt(end)}</strong> of <strong>${fmt(total)}</strong> ranks.`;
  }

  document.getElementById("first-btn").disabled = page <= 1;
  document.getElementById("prev-btn").disabled = page <= 1;
  document.getElementById("next-btn").disabled = page >= totalPages;
  document.getElementById("last-btn").disabled = page >= totalPages;
  document.getElementById("page-info").textContent = `Page ${fmt(page)} of ${fmt(totalPages)}`;

  document.querySelectorAll("thead th").forEach((th) => {
    const active = th.dataset.key === sortKey;
    th.classList.toggle("sorted", active);
    const ind = th.querySelector(".sort-ind");
    if (ind) ind.textContent = active ? (sortDir === "asc" ? "▲" : "▼") : "";
  });
}

/* ---------- Clear ---------- */

function clearAll() {
  for (const key of Object.keys(filterState)) filterState[key] = "";
  document.querySelectorAll(".score-input input").forEach((el) => {
    el.value = "";
  });
  sortKey = "rank";
  sortDir = "asc";
  page = 1;
  applyFilters();
}

/* ---------- Init ---------- */

function init() {
  if (!Array.isArray(D) || D.length === 0 || D.length % 3 !== 0) {
    document.getElementById("table-body").innerHTML =
      '<tr><td colspan="4" class="empty-cell">Could not load neetpg-marks.js</td></tr>';
    return;
  }

  createNumberInput(document.getElementById("filter-rank"), {
    key: "rank", label: "Find Exact Rank", placeholder: "e.g. 88859", min: 1,
  });
  createNumberInput(document.getElementById("filter-min-rank"), {
    key: "minRank", label: "Min Rank", placeholder: "Any", min: 1,
  });
  createNumberInput(document.getElementById("filter-max-rank"), {
    key: "maxRank", label: "Max Rank", placeholder: "Any", min: 1,
  });
  createNumberInput(document.getElementById("filter-min-m26"), {
    key: "minM26", label: "Min Marks 2026", placeholder: "Any",
  });
  createNumberInput(document.getElementById("filter-max-m26"), {
    key: "maxM26", label: "Max Marks 2026", placeholder: "Any",
  });
  createNumberInput(document.getElementById("filter-min-m25"), {
    key: "minM25", label: "Min Marks 2025", placeholder: "Any",
  });
  createNumberInput(document.getElementById("filter-max-m25"), {
    key: "maxM25", label: "Max Marks 2025", placeholder: "Any",
  });

  document.getElementById("apply-btn").addEventListener("click", applyFilters);
  document.getElementById("clear-btn").addEventListener("click", clearAll);
  document.querySelectorAll(".score-input input").forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyFilters();
    });
  });

  document.getElementById("first-btn").addEventListener("click", () => { page = 1; render(); });
  document.getElementById("prev-btn").addEventListener("click", () => { page = Math.max(1, page - 1); render(); });
  document.getElementById("next-btn").addEventListener("click", () => { page += 1; render(); });
  document.getElementById("last-btn").addEventListener("click", () => {
    page = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    render();
  });

  document.querySelectorAll("thead th").forEach((th) => {
    const ind = document.createElement("span");
    ind.className = "sort-ind";
    th.appendChild(ind);
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = "asc";
      }
      sortRows();
      render();
    });
  });

  applyFilters();
}

init();
