const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve frontend (local dev) ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Identity (fill in your real details) ──────────────────────────────────
const USER_ID = 'navridhisharma_10122004';
const EMAIL_ID = 'navridhi2080.be23@chitkara.edu.in';
const COLLEGE_ROLL_NUMBER = '2310992080';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate a single entry and return its canonical form or null.
 * Returns the trimmed edge string if valid, null otherwise.
 */
function validateEntry(raw) {
  const entry = typeof raw === 'string' ? raw.trim() : '';
  // Must match exactly: single uppercase letter -> single uppercase letter
  if (/^[A-Z]->[A-Z]$/.test(entry)) {
    const [parent, child] = [entry[0], entry[3]];
    if (parent === child) return null; // self-loop → invalid
    return entry;
  }
  return null;
}

/**
 * Build a nested tree object from adjacency list (no cycles guaranteed).
 */
function buildTree(node, adjacency) {
  const children = adjacency[node] || [];
  if (children.length === 0) return {};
  const subtree = {};
  for (const child of children) {
    subtree[child] = buildTree(child, adjacency);
  }
  return subtree;
}

/**
 * Compute the maximum depth (node count on longest root-to-leaf path).
 */
function computeDepth(node, adjacency) {
  const children = adjacency[node] || [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(c => computeDepth(c, adjacency)));
}

/**
 * Detect if there is a cycle reachable from 'start' within the given node set.
 * Uses DFS with a visited/recursion-stack approach.
 */
function hasCycle(nodes, adjacency) {
  const visited = new Set();
  const recStack = new Set();

  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    for (const neighbour of (adjacency[node] || [])) {
      if (!visited.has(neighbour)) {
        if (dfs(neighbour)) return true;
      } else if (recStack.has(neighbour)) {
        return true;
      }
    }
    recStack.delete(node);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node) && dfs(node)) return true;
  }
  return false;
}

/**
 * Find all connected components (treating edges as undirected for grouping).
 */
function findComponents(nodes, adjacency) {
  const visited = new Set();
  const components = [];

  // Build undirected adjacency for component grouping
  const undirected = {};
  for (const node of nodes) {
    undirected[node] = new Set();
  }
  for (const node of nodes) {
    for (const child of (adjacency[node] || [])) {
      undirected[node].add(child);
      if (!undirected[child]) undirected[child] = new Set();
      undirected[child].add(node);
    }
  }

  function bfs(start) {
    const component = new Set();
    const queue = [start];
    while (queue.length) {
      const curr = queue.shift();
      if (visited.has(curr)) continue;
      visited.add(curr);
      component.add(curr);
      for (const neighbour of (undirected[curr] || [])) {
        if (!visited.has(neighbour)) queue.push(neighbour);
      }
    }
    return component;
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      components.push(bfs(node));
    }
  }
  return components;
}

// ── Core Processing ──────────────────────────────────────────────────────────

function processData(data) {
  const invalid_entries = [];
  const duplicate_edges = [];

  // --- Step 1: validate entries ---
  const validEdges = [];
  const seenEdges = new Set();
  const childParentCount = {}; // tracks first parent for each child (diamond rule)

  for (const raw of data) {
    const valid = validateEntry(raw);
    if (!valid) {
      invalid_entries.push(typeof raw === 'string' ? raw : String(raw));
      continue;
    }
    // Check duplicates
    if (seenEdges.has(valid)) {
      // Only push to duplicate_edges once per unique edge
      if (!duplicate_edges.includes(valid)) {
        duplicate_edges.push(valid);
      }
      continue;
    }
    seenEdges.add(valid);
    validEdges.push(valid);
  }

  // --- Step 2: build adjacency applying diamond/multi-parent rule ---
  const adjacency = {};  // parent -> [children]
  const childOf = {};    // child -> first parent (diamond rule)
  const allNodes = new Set();

  for (const edge of validEdges) {
    const parent = edge[0];
    const child = edge[3];

    // Diamond rule: if child already has a parent, discard this edge silently
    if (childOf[child] !== undefined) continue;
    childOf[child] = parent;

    allNodes.add(parent);
    allNodes.add(child);

    if (!adjacency[parent]) adjacency[parent] = [];
    adjacency[parent].push(child);
  }

  // --- Step 3: group nodes into components ---
  const components = findComponents([...allNodes], adjacency);

  // --- Step 4: build hierarchy objects ---
  const hierarchies = [];

  for (const component of components) {
    const nodes = [...component];
    const componentAdj = {};
    for (const n of nodes) {
      componentAdj[n] = (adjacency[n] || []).filter(c => component.has(c));
    }

    // Detect cycle in this component
    const cycleFound = hasCycle(nodes, componentAdj);

    // Find roots: nodes not appearing as a child in this component
    const childrenInComponent = new Set();
    for (const n of nodes) {
      for (const c of (componentAdj[n] || [])) {
        childrenInComponent.add(c);
      }
    }
    const roots = nodes.filter(n => !childrenInComponent.has(n)).sort();

    // Determine the root
    let root;
    if (roots.length > 0) {
      root = roots[0]; // lexicographically smallest natural root
    } else {
      // Pure cycle — use lexicographically smallest node
      root = nodes.slice().sort()[0];
    }

    if (cycleFound) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const tree = { [root]: buildTree(root, componentAdj) };
      const depth = computeDepth(root, componentAdj);
      hierarchies.push({ root, tree, depth });
    }
  }

  // --- Step 5: sort hierarchies for consistent output ---
  // Non-cyclic trees first sorted by root, then cyclic groups
  hierarchies.sort((a, b) => {
    if (a.has_cycle && !b.has_cycle) return 1;
    if (!a.has_cycle && b.has_cycle) return -1;
    return a.root.localeCompare(b.root);
  });

  // --- Step 6: build summary ---
  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const total_trees = nonCyclic.length;
  const total_cycles = hierarchies.filter(h => h.has_cycle).length;

  let largest_tree_root = '';
  if (nonCyclic.length > 0) {
    const sorted = nonCyclic.slice().sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth; // desc by depth
      return a.root.localeCompare(b.root);               // asc by root (tiebreak)
    });
    largest_tree_root = sorted[0].root;
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: { total_trees, total_cycles, largest_tree_root },
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: '"data" must be an array of strings.' });
    }
    const result = processData(data);
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', message: 'BFHL API is running.' }));

app.listen(PORT, () => console.log(`BFHL API listening on port ${PORT}`));
