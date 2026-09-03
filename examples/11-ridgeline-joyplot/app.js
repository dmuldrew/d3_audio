import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleFilter,
  choreography,
  defaultEngine,
  createSynth
} from '../../src/index.js';

// 8 Ridgeline frequency/temporal bands
const NUM_RIDGES = 8;
const NUM_POINTS = 32;
const ridgeLabels = ["Band 1", "Band 2", "Band 3", "Band 4", "Band 5", "Band 6", "Band 7", "Band 8"];
const ridgeColors = [
  "#38bdf8", "#06b6d4", "#10b981", "#84cc16",
  "#eab308", "#f97316", "#ef4444", "#a855f7"
];

// Generate smooth gaussian peak density curves
const ridgeData = [];
for (let r = 0; r < NUM_RIDGES; r++) {
  const points = [];
  const peakPos = 0.2 + (r / (NUM_RIDGES - 1)) * 0.6;
  const spread = 0.15 + (Math.sin(r) * 0.05);

  for (let p = 0; p < NUM_POINTS; p++) {
    const xVal = p / (NUM_POINTS - 1);
    const dist = (xVal - peakPos) / spread;
    const density = Math.exp(-0.5 * dist * dist) * (30 + (r * 6)) + Math.random() * 2;
    points.push({ x: p, density });
  }
  ridgeData.push({ id: r, name: ridgeLabels[r], points });
}

const container = document.getElementById('ridge-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 480;
const margin = { top: 30, right: 30, bottom: 40, left: 60 };

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

// Scales
const xScale = d3.scaleLinear()
  .domain([0, NUM_POINTS - 1])
  .range([margin.left, width - margin.right]);

const yGroupScale = d3.scalePoint()
  .domain(ridgeLabels)
  .range([margin.top, height - margin.bottom]);

const yDensityScale = d3.scaleLinear()
  .domain([0, 80])
  .range([0, -65]);

let currentScale = 'pentatonic';
let currentMovement = 'glow';

const pitchScale = scalePitch()
  .domain([0, NUM_POINTS - 1])
  .range(["C3", "C6"])
  .scale(currentScale)
  .root("C");

const filterScale = scaleFilter()
  .domain([0, NUM_POINTS - 1])
  .range([300, 8000]);

const panScale = scalePan()
  .domain([margin.left, width - margin.right])
  .range([-0.85, 0.85]);

const synth = createSynth({ type: "fmSynth", volume: -2 });

// Area & Line Generators
const areaGen = d3.area()
  .x(d => xScale(d.x))
  .y0(0)
  .y1(d => yDensityScale(d.density))
  .curve(d3.curveBasis);

const lineGen = d3.line()
  .x(d => xScale(d.x))
  .y(d => yDensityScale(d.density))
  .curve(d3.curveBasis);

// Render Ridges
const ridgeGroups = svg.selectAll('.ridge-group')
  .data(ridgeData)
  .enter()
  .append('g')
  .attr('class', 'ridge-group')
  .attr('transform', d => `translate(0, ${yGroupScale(d.name)})`);

ridgeGroups.append('path')
  .attr('class', 'ridge-path')
  .attr('d', d => areaGen(d.points))
  .attr('fill', (d, i) => ridgeColors[i])
  .attr('fill-opacity', 0.65)
  .attr('stroke', (d, i) => d3.color(ridgeColors[i]).brighter(0.8))
  .attr('stroke-width', 2);

ridgeGroups.append('text')
  .attr('x', margin.left - 10)
  .attr('y', 0)
  .attr('text-anchor', 'end')
  .attr('fill', '#94a3b8')
  .attr('font-size', '11px')
  .attr('font-weight', '700')
  .text(d => d.name);

// Scan Line
const scanLine = svg.append('line')
  .attr('class', 'scan-line')
  .attr('y1', margin.top - 10)
  .attr('y2', height - margin.bottom + 10)
  .attr('x1', 0)
  .attr('x2', 0)
  .attr('opacity', 0);

// Sonify Point
function sonifyRidgePoint(ridgeIdx, pointIdx, domElement) {
  const note = pitchScale(pointIdx);
  const cutoff = filterScale(pointIdx);
  const pan = panScale(xScale(pointIdx));
  const vel = Math.min(1.0, 0.5 + (ridgeData[ridgeIdx].points[pointIdx].density / 100));

  synth.triggerAttackRelease(note, "16n", undefined, vel, { pan, filter: cutoff });

  document.getElementById('ridge-status').innerText = `${ridgeLabels[ridgeIdx]} [Point ${pointIdx}]: ${note} (Filter: ${Math.round(cutoff)}Hz)`;

  if (domElement) {
    choreography()
      .movement(currentMovement)
      .intensity(1.3)
      .duration(0.3)(domElement);
  }
}

// Mouse interaction
svg.on('mousemove', async function(event) {
  await defaultEngine.start();
  const [mx, my] = d3.pointer(event, this);
  const pointIdx = Math.max(0, Math.min(NUM_POINTS - 1, Math.round(xScale.invert(mx))));

  // Find closest ridge
  let closestRidge = 0;
  let minDist = Infinity;
  ridgeData.forEach((r, idx) => {
    const ry = yGroupScale(r.name);
    const dist = Math.abs(my - ry);
    if (dist < minDist) {
      minDist = dist;
      closestRidge = idx;
    }
  });

  scanLine.attr('opacity', 1).attr('x1', mx).attr('x2', mx);

  const ridgeDom = ridgeGroups.nodes()[closestRidge];
  sonifyRidgePoint(closestRidge, pointIdx, ridgeDom);
});

// Auto Topographic Sweep
let isSweeping = false;
let sweepPoint = 0;
let sweepRidge = 0;
let sweepTimer = null;

async function stepSweep() {
  const xPos = xScale(sweepPoint);
  scanLine.attr('opacity', 1).attr('x1', xPos).attr('x2', xPos);

  const ridgeDom = ridgeGroups.nodes()[sweepRidge];
  sonifyRidgePoint(sweepRidge, sweepPoint, ridgeDom);

  sweepRidge = (sweepRidge + 1) % NUM_RIDGES;
  if (sweepRidge === 0) {
    sweepPoint = (sweepPoint + 1) % NUM_POINTS;
  }
}

const sweepBtn = document.getElementById('sweep-ridge-btn');
sweepBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isSweeping) {
    clearInterval(sweepTimer);
    isSweeping = false;
    scanLine.attr('opacity', 0);
    sweepBtn.innerText = "⚡ Start Topographic Sweep";
  } else {
    isSweeping = true;
    sweepPoint = 0;
    sweepRidge = 0;
    const speed = +document.getElementById('sweep-speed').value;
    sweepTimer = setInterval(stepSweep, speed);
    sweepBtn.innerText = "⏸ Stop Topographic Sweep";
  }
});

document.getElementById('sweep-speed').addEventListener('input', (e) => {
  if (isSweeping) {
    clearInterval(sweepTimer);
    sweepTimer = setInterval(stepSweep, +e.target.value);
  }
});

document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScale.scale(currentScale);
});

document.getElementById('move-select').addEventListener('change', (e) => {
  currentMovement = e.target.value;
});
