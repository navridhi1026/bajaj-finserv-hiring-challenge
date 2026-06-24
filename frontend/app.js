/* ────────────────────────────────────────────────────────────────────────────
   app.js  –  BFHL Node Hierarchy Explorer
   ──────────────────────────────────────────────────────────────────────────── */

// ── Config ────────────────────────────────────────────────────────────────
// Change this to your deployed backend URL when hosting.
// If both frontend and backend are served from the same origin, you can use '/bfhl'.
const API_BASE = 'https://bajaj-finserv-hiring-challenge.onrender.com';

// ── DOM refs ──────────────────────────────────────────────────────────────
const nodeInput       = document.getElementById('node-input');
const submitBtn       = document.getElementById('submit-btn');
const btnText         = submitBtn.querySelector('.btn-text');
const btnIcon         = submitBtn.querySelector('.btn-icon');
const btnLoader       = document.getElementById('btn-loader');
const entryCounter    = document.getElementById('entry-count');
const errorBanner     = document.getElementById('error-banner');
const errorMsg        = document.getElementById('error-msg');
const errorClose      = document.getElementById('error-close');
const resultsSection  = document.getElementById('results-section');

const resUserId       = document.getElementById('res-userid');
const resEmail        = document.getElementById('res-email');
const resRoll         = document.getElementById('res-roll');

const statTrees       = document.getElementById('stat-trees');
const statCycles      = document.getElementById('stat-cycles');
const statLargest     = document.getElementById('stat-largest');
const statInvalid     = document.getElementById('stat-invalid');
const statDupes       = document.getElementById('stat-dupes');

const hierarchiesCont = document.getElementById('hierarchies-container');
const invalidList     = document.getElementById('invalid-list');
const duplicateList   = document.getElementById('duplicate-list');

const rawToggle       = document.getElementById('raw-toggle');
const rawBody         = document.getElementById('raw-body');
const rawJson         = document.getElementById('raw-json');
const rawChevron      = document.getElementById('raw-chevron');

// ── Example data ──────────────────────────────────────────────────────────
const EXAMPLES = {
  simple: 'A->B, A->C, B->D, C->E',
  cycle:  'A->B, B->C, C->A, X->Y, Y->Z',
  full: [
    'A->B', 'A->C', 'B->D', 'C->E', 'E->F',
    'X->Y', 'Y->Z', 'Z->X',
    'P->Q', 'Q->R',
    'G->H', 'G->H', 'G->I',
    'hello', '1->2', 'A->'
  ].join(', ')
};

document.getElementById('btn-example-simple').addEventListener('click', () => {
  nodeInput.value = EXAMPLES.simple; updateCounter();
});
document.getElementById('btn-example-cycle').addEventListener('click', () => {
  nodeInput.value = EXAMPLES.cycle; updateCounter();
});
document.getElementById('btn-example-full').addEventListener('click', () => {
  nodeInput.value = EXAMPLES.full; updateCounter();
});
document.getElementById('btn-clear').addEventListener('click', () => {
  nodeInput.value = ''; updateCounter(); hideResults(); hideError();
});

// ── Counter ───────────────────────────────────────────────────────────────
function parseEntries(raw) {
  return raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
}
function updateCounter() {
  const entries = parseEntries(nodeInput.value);
  entryCounter.textContent = `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`;
}
nodeInput.addEventListener('input', updateCounter);

// ── Error handling ────────────────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.hidden = false;
  errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideError() { errorBanner.hidden = true; }
errorClose.addEventListener('click', hideError);

// ── Loading state ─────────────────────────────────────────────────────────
function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.textContent = loading ? 'Analysing…' : 'Analyse Hierarchy';
  btnLoader.hidden = !loading;
  btnIcon.hidden = loading;
}

// ── Results visibility ────────────────────────────────────────────────────
function hideResults() { resultsSection.hidden = true; }
function showResults()  { resultsSection.hidden = false; }

// ── Tree renderer (recursive, text-based art) ─────────────────────────────
function renderTreeLines(node, subtree, prefix, isLast, lines) {
  const connector = isLast ? '└── ' : '├── ';
  lines.push({ indent: prefix, connector, label: node });

  const children = Object.keys(subtree);
  const childPrefix = prefix + (isLast ? '    ' : '│   ');
  children.forEach((child, idx) => {
    renderTreeLines(child, subtree[child], childPrefix, idx === children.length - 1, lines);
  });
}

function buildTreeView(root, treeObj) {
  // treeObj is { "A": { "B": {}, ... } }
  const rootSubtree = treeObj[root] || {};
  const lines = [];
  renderTreeLines(root, rootSubtree, '', true, lines);

  const container = document.createElement('div');
  container.className = 'tree-view';

  // First line (root) — no prefix/connector
  lines.forEach(({ indent, connector, label }, i) => {
    const row = document.createElement('div');
    row.className = 'tree-node';

    if (i === 0) {
      // root node
      const lbl = document.createElement('span');
      lbl.className = 'tree-label';
      lbl.textContent = label;
      row.appendChild(lbl);
    } else {
      const ind = document.createElement('span');
      ind.className = 'tree-indent';
      ind.textContent = indent;

      const conn = document.createElement('span');
      conn.className = 'tree-connector';
      conn.textContent = connector;

      const lbl = document.createElement('span');
      lbl.className = 'tree-label';
      lbl.textContent = label;

      row.appendChild(ind);
      row.appendChild(conn);
      row.appendChild(lbl);
    }
    container.appendChild(row);
  });
  return container;
}

// ── Hierarchy card builder ────────────────────────────────────────────────
function buildHierarchyCard(h, index) {
  const card = document.createElement('div');
  card.className = 'hierarchy-card';
  card.style.animationDelay = `${index * 0.07}s`;

  // Header
  const header = document.createElement('div');
  header.className = 'hc-header';
  const rootEl = document.createElement('div');
  rootEl.className = 'hc-root';
  rootEl.textContent = h.root;

  const badge = document.createElement('span');
  badge.className = `hc-badge ${h.has_cycle ? 'badge-cycle' : 'badge-tree'}`;
  badge.textContent = h.has_cycle ? '⟲ Cycle' : '✓ Tree';

  header.appendChild(rootEl);
  header.appendChild(badge);
  card.appendChild(header);

  // Meta
  if (!h.has_cycle) {
    const meta = document.createElement('div');
    meta.className = 'hc-meta';
    meta.innerHTML = `<span>Depth: <strong>${h.depth}</strong></span>`;
    card.appendChild(meta);
  }

  // Tree / cycle content
  if (h.has_cycle) {
    const cycleMsg = document.createElement('div');
    cycleMsg.className = 'cycle-msg';
    cycleMsg.textContent = 'Cycle detected — no tree structure available.';
    card.appendChild(cycleMsg);
  } else {
    card.appendChild(buildTreeView(h.root, h.tree));
  }

  return card;
}

// ── Tag builder ───────────────────────────────────────────────────────────
function buildTags(container, items, cssClass, emptyMsg) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    const em = document.createElement('span');
    em.className = 'empty-msg';
    em.textContent = emptyMsg;
    container.appendChild(em);
    return;
  }
  items.forEach((item, i) => {
    const tag = document.createElement('span');
    tag.className = `tag ${cssClass}`;
    tag.style.animationDelay = `${i * 0.05}s`;
    tag.textContent = item;
    container.appendChild(tag);
  });
}

// ── Render response ───────────────────────────────────────────────────────
function renderResponse(data) {
  // Identity
  resUserId.textContent = data.user_id;
  resEmail.textContent  = data.email_id;
  resRoll.textContent   = data.college_roll_number;

  // Summary stats
  statTrees.textContent   = data.summary.total_trees;
  statCycles.textContent  = data.summary.total_cycles;
  statLargest.textContent = data.summary.largest_tree_root || '—';
  statInvalid.textContent = data.invalid_entries.length;
  statDupes.textContent   = data.duplicate_edges.length;

  // Hierarchies
  hierarchiesCont.innerHTML = '';
  (data.hierarchies || []).forEach((h, i) => {
    hierarchiesCont.appendChild(buildHierarchyCard(h, i));
  });

  // Flags
  buildTags(invalidList,   data.invalid_entries, 'tag-invalid', 'None — all entries are valid.');
  buildTags(duplicateList, data.duplicate_edges, 'tag-dupe',    'None — no duplicate edges found.');

  // Raw JSON
  rawJson.textContent = JSON.stringify(data, null, 2);
  rawBody.hidden = true;
  rawChevron.classList.remove('open');

  showResults();
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Raw JSON toggle ───────────────────────────────────────────────────────
rawToggle.addEventListener('click', () => {
  rawBody.hidden = !rawBody.hidden;
  rawChevron.classList.toggle('open', !rawBody.hidden);
});

// ── Submit ────────────────────────────────────────────────────────────────
submitBtn.addEventListener('click', handleSubmit);
nodeInput.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') handleSubmit();
});

async function handleSubmit() {
  hideError();
  const raw = nodeInput.value.trim();
  if (!raw) {
    showError('Please enter at least one node pair before submitting.');
    return;
  }

  const data = parseEntries(raw);

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/bfhl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server returned HTTP ${res.status}`);
    }

    const json = await res.json();
    renderResponse(json);
  } catch (err) {
    let msg = err.message;
    if (err instanceof TypeError && err.message.includes('fetch')) {
      msg = 'Could not reach the API. Make sure the backend is running on ' + API_BASE;
    }
    showError(msg);
    hideResults();
  } finally {
    setLoading(false);
  }
}
