import {
  scalePitch,
  scaleGain,
  scalePan,
  choreography,
  defaultEngine,
  createSynth
} from '/src/index.js';

// Generate network graph data with 3 clusters
const nodes = [];
const links = [];
const NUM_NODES = 24;

const clusters = [
  { id: 0, name: "Cluster A", color: "#38bdf8" },
  { id: 1, name: "Cluster B", color: "#ec4899" },
  { id: 2, name: "Cluster C", color: "#10b981" }
];

for (let i = 0; i < NUM_NODES; i++) {
  const clusterId = i % 3;
  nodes.push({
    id: i,
    cluster: clusterId,
    color: clusters[clusterId].color,
    radius: 12 + Math.floor(Math.random() * 12),
    degree: 0
  });
}

// Inter-cluster and intra-cluster links
for (let i = 0; i < NUM_NODES; i++) {
  // Connect within cluster
  const target1 = (i + 1) % NUM_NODES;
  links.push({ source: i, target: target1 });
  nodes[i].degree++;
  nodes[target1].degree++;

  if (Math.random() > 0.4) {
    const target2 = (i + 3) % NUM_NODES;
    links.push({ source: i, target: target2 });
    nodes[i].degree++;
    nodes[target2].degree++;
  }
}

const container = document.getElementById('network-area');
const width = container.clientWidth || 650;
const height = container.clientHeight || 520;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

// Scales
let currentScale = 'pentatonic';
let currentMovement = 'wiggle';

const pitchScale = scalePitch()
  .domain([0, 8])
  .range(["C3", "C6"])
  .scale(currentScale)
  .root("C");

const panScale = scalePan()
  .domain([0, width])
  .range([-0.85, 0.85]);

const synthPluck = createSynth({ type: "pluckSynth" });
const synthPoly = createSynth({ type: "polySynth", volume: -2 });

// D3 Force Simulation
const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(65))
  .force("charge", d3.forceManyBody().strength(-180))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collision", d3.forceCollide().radius(d => d.radius + 6));

// Render Links
const linkElements = svg.append("g")
  .selectAll("line")
  .data(links)
  .enter()
  .append("line")
  .attr("class", "link");

// Render Nodes
const nodeElements = svg.append("g")
  .selectAll("g")
  .data(nodes)
  .enter()
  .append("g")
  .attr("class", "node")
  .call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended));

const circles = nodeElements.append("circle")
  .attr("r", d => d.radius)
  .attr("fill", d => d.color)
  .attr("stroke", "#ffffff")
  .attr("stroke-width", 2)
  .attr("opacity", 0.9);

const labels = nodeElements.append("text")
  .attr("text-anchor", "middle")
  .attr("dy", ".3em")
  .attr("fill", "#040811")
  .attr("font-size", "10px")
  .attr("font-weight", "800")
  .text(d => d.id);

simulation.on("tick", () => {
  linkElements
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  nodeElements
    .attr("transform", d => `translate(${d.x}, ${d.y})`);
});

// Drag handlers with plucked sonification
function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

async function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;

  await defaultEngine.start();
  pluckNode(d, nodeElements.nodes()[d.id]);
}

function pluckNode(d, domElement) {
  const note = pitchScale(d.degree);
  const pan = panScale(d.x);
  synthPoly.triggerAttackRelease(note, "8n", undefined, 0.85, { pan });

  document.getElementById('graph-status').innerText = `Node ${d.id} Plucked: ${note} (Pan: ${pan.toFixed(2)})`;

  choreography()
    .movement(currentMovement)
    .intensity(1.4)
    .duration(0.4)(domElement);
}

// Click to audition
nodeElements.on("click", async function(event, d) {
  await defaultEngine.start();
  pluckNode(d, this);
});

// Algorithmic Graph Impulse Walk
let isWalking = false;
let walkTimer = null;
let currentWalkIndex = 0;

async function stepWalk() {
  const curr = nodes[currentWalkIndex];
  const domEl = nodeElements.nodes()[currentWalkIndex];
  pluckNode(curr, domEl);

  // Find neighbors
  const neighbors = links
    .filter(l => l.source.id === curr.id || l.target.id === curr.id)
    .map(l => (l.source.id === curr.id ? l.target.id : l.source.id));

  // Highlight active link
  linkElements.classed("active", l => 
    (l.source.id === curr.id && neighbors.includes(l.target.id)) ||
    (l.target.id === curr.id && neighbors.includes(l.source.id))
  );

  setTimeout(() => {
    linkElements.classed("active", false);
  }, 180);

  // Pick random neighbor or next node
  if (neighbors.length > 0) {
    currentWalkIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
  } else {
    currentWalkIndex = (currentWalkIndex + 1) % NUM_NODES;
  }
}

const pulseWalkBtn = document.getElementById('pulse-walk-btn');
pulseWalkBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isWalking) {
    clearInterval(walkTimer);
    isWalking = false;
    pulseWalkBtn.innerText = "⚡ Start Graph Impulse Walk";
  } else {
    isWalking = true;
    const interval = +document.getElementById('walk-speed').value;
    walkTimer = setInterval(stepWalk, interval);
    pulseWalkBtn.innerText = "⏸ Stop Impulse Walk";
  }
});

document.getElementById('walk-speed').addEventListener('input', (e) => {
  if (isWalking) {
    clearInterval(walkTimer);
    walkTimer = setInterval(stepWalk, +e.target.value);
  }
});

document.getElementById('jiggle-btn').addEventListener('click', () => {
  simulation.alpha(0.8).restart();
  nodeElements.each(function(d) {
    choreography().movement("shake").intensity(1.2).duration(0.4)(this);
  });
});

document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScale.scale(currentScale);
});

document.getElementById('move-select').addEventListener('change', (e) => {
  currentMovement = e.target.value;
});
