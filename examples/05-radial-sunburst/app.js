import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleFilter,
  audioLegend,
  choreography,
  defaultEngine,
  createSynth
} from '../../src/index.js';

// Hierarchical cyclical dataset (3 concentric rings: Root categories -> Subcategories -> Tiers)
const hierarchyData = {
  name: "Cycles",
  children: [
    {
      name: "Phase Alpha",
      color: "#38bdf8",
      children: [
        { name: "Alpha 1", value: 35, children: [{ name: "A1-a", value: 18 }, { name: "A1-b", value: 17 }] },
        { name: "Alpha 2", value: 45, children: [{ name: "A2-a", value: 25 }, { name: "A2-b", value: 20 }] },
        { name: "Alpha 3", value: 30, children: [{ name: "A3-a", value: 15 }, { name: "A3-b", value: 15 }] }
      ]
    },
    {
      name: "Phase Beta",
      color: "#ec4899",
      children: [
        { name: "Beta 1", value: 50, children: [{ name: "B1-a", value: 30 }, { name: "B1-b", value: 20 }] },
        { name: "Beta 2", value: 40, children: [{ name: "B2-a", value: 22 }, { name: "B2-b", value: 18 }] }
      ]
    },
    {
      name: "Phase Gamma",
      color: "#a855f7",
      children: [
        { name: "Gamma 1", value: 30, children: [{ name: "G1-a", value: 14 }, { name: "G1-b", value: 16 }] },
        { name: "Gamma 2", value: 60, children: [{ name: "G2-a", value: 35 }, { name: "G2-b", value: 25 }] },
        { name: "Gamma 3", value: 35, children: [{ name: "G3-a", value: 20 }, { name: "G3-b", value: 15 }] }
      ]
    },
    {
      name: "Phase Delta",
      color: "#10b981",
      children: [
        { name: "Delta 1", value: 40, children: [{ name: "D1-a", value: 20 }, { name: "D1-b", value: 20 }] },
        { name: "Delta 2", value: 55, children: [{ name: "D2-a", value: 30 }, { name: "D2-b", value: 25 }] }
      ]
    }
  ]
};

const container = document.getElementById('sunburst-area');
const width = container.clientWidth || 550;
const height = container.clientHeight || 520;
const radius = Math.min(width, height) / 2 - 20;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g')
  .attr('transform', `translate(${width / 2}, ${height / 2})`);

// D3 Partition Layout
const root = d3.hierarchy(hierarchyData)
  .sum(d => d.value || 10)
  .sort((a, b) => b.value - a.value);

const partition = d3.partition()
  .size([2 * Math.PI, radius]);

partition(root);

const arc = d3.arc()
  .startAngle(d => d.x0)
  .endAngle(d => d.x1)
  .innerRadius(d => d.y0)
  .outerRadius(d => d.y1 - 2)
  .padAngle(0.015)
  .padRadius(radius / 2);

// Scales
let currentScale = 'pentatonic';
let currentMovement = 'pulse';

const pitchScaleInner = scalePitch().domain([0, 2 * Math.PI]).range(["C3", "G4"]).scale(currentScale);
const pitchScaleMid = scalePitch().domain([0, 2 * Math.PI]).range(["C4", "C5"]).scale(currentScale);
const pitchScaleOuter = scalePitch().domain([0, 2 * Math.PI]).range(["C5", "G6"]).scale(currentScale);

const gainScale = scaleGain().domain([10, 60]).range([0.4, 0.9]);
const panScale = scalePan().domain([-radius, radius]).range([-0.85, 0.85]);

const colorScale = d3.scaleOrdinal()
  .domain(["Phase Alpha", "Phase Beta", "Phase Gamma", "Phase Delta"])
  .range(["#38bdf8", "#ec4899", "#a855f7", "#10b981"]);

function getNodeColor(d) {
  if (d.depth === 0) return 'rgba(255,255,255,0.06)';
  const ancestor = d.ancestors().find(a => a.depth === 1) || d;
  const base = d3.color(colorScale(ancestor.data.name));
  if (d.depth === 2) return base.brighter(0.4);
  if (d.depth === 3) return base.brighter(0.8);
  return base;
}

// Synths for layers
const synthLead = createSynth({ type: "fmSynth", harmonicity: 2.0, volume: -2 });
const synthBass = createSynth({ type: "polySynth", volume: -3 });

// Interactive Audio Legend
const legend = audioLegend()
  .title("Radial Sunburst Cyclic Audio Key")
  .pitch(pitchScaleMid, "Radial Angle / Ring Depth (C3 Root ➔ G6 Leaves)")
  .pan(panScale, "X Coordinate in Circular Space (Left ↔ Right)")
  .gain(gainScale, "Subtree Weight / Segment Area");

d3.select("#legend-mount").call(legend);

// Render Arcs
const segments = g.selectAll('path')
  .data(root.descendants().filter(d => d.depth > 0))
  .enter()
  .append('path')
  .attr('class', 'arc-segment')
  .attr('d', arc)
  .attr('fill', d => getNodeColor(d))
  .attr('opacity', 0.9);

// Radar needle line
const needle = g.append('line')
  .attr('class', 'radar-needle')
  .attr('x1', 0)
  .attr('y1', 0)
  .attr('x2', 0)
  .attr('y2', -radius)
  .attr('opacity', 0);

// Audition function
async function auditionArc(element, d) {
  await defaultEngine.start();
  const midAngle = (d.x0 + d.x1) / 2;
  const midRadius = (d.y0 + d.y1) / 2;
  const posX = Math.sin(midAngle) * midRadius;

  let note;
  if (d.depth === 1) note = pitchScaleInner(midAngle);
  else if (d.depth === 2) note = pitchScaleMid(midAngle);
  else note = pitchScaleOuter(midAngle);

  const vel = gainScale(d.value || 30);
  const pan = panScale(posX);

  if (d.depth === 1) {
    synthBass.triggerAttackRelease(note, "4n", undefined, vel, { pan });
  } else {
    synthLead.triggerAttackRelease(note, "8n", undefined, vel, { pan });
  }

  document.getElementById('active-note-badge').innerText = `${note} (${d.data.name})`;

  choreography()
    .movement(currentMovement)
    .intensity((d.value || 30) / 25)
    .duration(0.4)(element);
}

segments.on('mouseenter click', function(event, d) {
  auditionArc(this, d);
});

// Radar sweeping loop
let isSweeping = false;
let sweepStartTime = 0;
let sweepDuration = 12000; // ms per revolution
let animFrameId = null;
let triggeredNodes = new Set();

function sweepFrame(timestamp) {
  if (!sweepStartTime) sweepStartTime = timestamp;
  const elapsed = timestamp - sweepStartTime;
  const currentAngle = ((elapsed % sweepDuration) / sweepDuration) * 2 * Math.PI;

  // Rotate Needle
  const nx = Math.sin(currentAngle) * radius;
  const ny = -Math.cos(currentAngle) * radius;
  needle.attr('x2', nx).attr('y2', ny);

  // Check intersecting arcs
  segments.each(function(d) {
    if (currentAngle >= d.x0 && currentAngle <= d.x1) {
      if (!triggeredNodes.has(d)) {
        triggeredNodes.add(d);
        auditionArc(this, d);
      }
    } else {
      triggeredNodes.delete(d);
    }
  });

  if (isSweeping) {
    animFrameId = requestAnimationFrame(sweepFrame);
  }
}

const playBtn = document.getElementById('play-sunburst-btn');
playBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isSweeping) {
    isSweeping = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    needle.attr('opacity', 0);
    playBtn.innerText = "▶ Sweep Radial Radar";
  } else {
    isSweeping = true;
    sweepStartTime = 0;
    triggeredNodes.clear();
    needle.attr('opacity', 1);
    playBtn.innerText = "⏸ Stop Sweep";
    animFrameId = requestAnimationFrame(sweepFrame);
  }
});

// Controls
document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScaleInner.scale(currentScale);
  pitchScaleMid.scale(currentScale);
  pitchScaleOuter.scale(currentScale);
});

document.getElementById('move-select').addEventListener('change', (e) => {
  currentMovement = e.target.value;
});

document.getElementById('speed-slider').addEventListener('input', (e) => {
  const sec = +e.target.value;
  document.getElementById('speed-val').innerText = sec;
  sweepDuration = sec * 1000;
});
