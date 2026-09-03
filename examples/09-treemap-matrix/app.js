import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleDuration,
  choreography,
  defaultEngine,
  createSynth
} from '../../src/index.js';

// Hierarchical Market Dataset
const marketData = {
  name: "Market",
  children: [
    {
      name: "Technology",
      children: [
        { name: "AAPL", value: 300, change: 2.4 },
        { name: "MSFT", value: 280, change: 1.8 },
        { name: "GOOGL", value: 210, change: -0.8 },
        { name: "NVDA", value: 260, change: 4.5 }
      ]
    },
    {
      name: "Healthcare",
      children: [
        { name: "JNJ", value: 160, change: 0.5 },
        { name: "UNH", value: 190, change: -1.4 },
        { name: "PFE", value: 120, change: -2.1 }
      ]
    },
    {
      name: "Finance",
      children: [
        { name: "JPM", value: 200, change: 1.2 },
        { name: "BAC", value: 140, change: -0.6 },
        { name: "GS", value: 150, change: 2.1 }
      ]
    },
    {
      name: "Energy & CleanTech",
      children: [
        { name: "TSLA", value: 220, change: 3.8 },
        { name: "XOM", value: 170, change: -1.9 },
        { name: "ENPH", value: 110, change: 2.7 }
      ]
    }
  ]
};

const container = document.getElementById('treemap-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 480;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

// Treemap Layout
const root = d3.hierarchy(marketData)
  .sum(d => d.value)
  .sort((a, b) => b.value - a.value);

d3.treemap()
  .size([width, height])
  .paddingInner(3)
  .paddingOuter(4)
  .paddingTop(18)
  .round(true)(root);

// Scales
let currentScale = 'pentatonic';
let currentMovement = 'flip';

const pitchScale = scalePitch()
  .domain([100, 320])
  .range(["C3", "C6"])
  .scale(currentScale)
  .root("C");

const gainScale = scaleGain()
  .domain([100, 320])
  .range([0.45, 0.95]);

const durationScale = scaleDuration()
  .domain([100, 320])
  .range(["16n", "4n"]);

const panScale = scalePan()
  .domain([0, width])
  .range([-0.85, 0.85]);

const synthGain = createSynth({ type: "polySynth", volume: -2 });
const synthLoss = createSynth({ type: "fmSynth", volume: -2 });

// Color scale for market change
function getNodeFill(d) {
  if (d.data.change >= 0) {
    return d3.interpolateGreens(0.4 + Math.min(0.5, d.data.change / 6));
  } else {
    return d3.interpolateReds(0.4 + Math.min(0.5, Math.abs(d.data.change) / 6));
  }
}

// Render Sector Headers
svg.selectAll('.sector-header')
  .data(root.children)
  .enter()
  .append('text')
  .attr('class', 'sector-header')
  .attr('x', d => d.x0 + 6)
  .attr('y', d => d.y0 + 13)
  .attr('fill', '#94a3b8')
  .attr('font-size', '11px')
  .attr('font-weight', '700')
  .text(d => d.data.name);

// Render Stock Leaf Nodes
const leafNodes = svg.selectAll('.treemap-node')
  .data(root.leaves())
  .enter()
  .append('g')
  .attr('class', 'treemap-node')
  .attr('transform', d => `translate(${d.x0}, ${d.y0})`);

leafNodes.append('rect')
  .attr('width', d => d.x1 - d.x0)
  .attr('height', d => d.y1 - d.y0)
  .attr('fill', d => getNodeFill(d))
  .attr('rx', 4)
  .attr('stroke', 'rgba(0,0,0,0.4)')
  .attr('stroke-width', 1);

leafNodes.append('text')
  .attr('x', 8)
  .attr('y', 18)
  .attr('fill', '#ffffff')
  .attr('font-size', '12px')
  .attr('font-weight', '800')
  .text(d => d.data.name);

leafNodes.append('text')
  .attr('x', 8)
  .attr('y', 34)
  .attr('fill', 'rgba(255,255,255,0.85)')
  .attr('font-size', '10px')
  .attr('font-weight', '600')
  .text(d => `${d.data.change >= 0 ? '+' : ''}${d.data.change}%`);

// Sonify Node
function sonifyNode(d, domElement) {
  const note = pitchScale(d.data.value);
  const dur = durationScale(d.data.value);
  const vel = gainScale(d.data.value);
  const midX = (d.x0 + d.x1) / 2;
  const pan = panScale(midX);

  if (d.data.change >= 0) {
    synthGain.triggerAttackRelease(note, dur, undefined, vel, { pan });
  } else {
    synthLoss.triggerAttackRelease(note, dur, undefined, vel, { pan });
  }

  document.getElementById('market-status').innerText = `${d.data.name}: ${note} (${d.data.change >= 0 ? '+' : ''}${d.data.change}%)`;

  choreography()
    .movement(currentMovement)
    .intensity(d.data.value / 180)
    .duration(0.35)(domElement);
}

leafNodes.on('mouseenter click', async function(event, d) {
  await defaultEngine.start();
  sonifyNode(d, this);
});

// Market Scanner
let isScanning = false;
let scanIndex = 0;
let scanTimer = null;
const leaves = root.leaves();

async function stepScan() {
  const d = leaves[scanIndex];
  const domNode = leafNodes.nodes()[scanIndex];
  sonifyNode(d, domNode);
  scanIndex = (scanIndex + 1) % leaves.length;
}

const scanBtn = document.getElementById('scan-market-btn');
scanBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isScanning) {
    clearInterval(scanTimer);
    isScanning = false;
    scanBtn.innerText = "⚡ Start Market Scanner";
  } else {
    isScanning = true;
    const speed = +document.getElementById('scan-speed').value;
    scanTimer = setInterval(stepScan, speed);
    scanBtn.innerText = "⏸ Stop Scanner";
  }
});

document.getElementById('scan-speed').addEventListener('input', (e) => {
  if (isScanning) {
    clearInterval(scanTimer);
    scanTimer = setInterval(stepScan, +e.target.value);
  }
});

document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScale.scale(currentScale);
});

document.getElementById('move-select').addEventListener('change', (e) => {
  currentMovement = e.target.value;
});
