import {
  scalePitch,
  scaleGain,
  scalePan,
  choreography,
  defaultEngine,
  createSynth
} from '/src/index.js';

// Bilateral flow matrix between 5 global regions
const matrix = [
  [12, 19, 11, 28, 14], // Region A
  [21, 10, 24, 18, 12], // Region B
  [14, 25,  8, 20, 16], // Region C
  [29, 16, 22, 11, 25], // Region D
  [16, 12, 15, 23,  9]  // Region E
];

const regionNames = ["Americas", "Europe", "East Asia", "South Asia", "Oceania"];
const regionColors = ["#38bdf8", "#ec4899", "#a855f7", "#10b981", "#f59e0b"];

const container = document.getElementById('chord-area');
const width = container.clientWidth || 550;
const height = container.clientHeight || 520;
const outerRadius = Math.min(width, height) * 0.5 - 40;
const innerRadius = outerRadius - 24;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g')
  .attr('transform', `translate(${width / 2}, ${height / 2})`);

// D3 Chord Layout
const chord = d3.chord()
  .padAngle(0.05)
  .sortSubgroups(d3.descending);

const arc = d3.arc()
  .innerRadius(innerRadius)
  .outerRadius(outerRadius);

const ribbon = d3.ribbon()
  .radius(innerRadius);

const chords = chord(matrix);

// Scales
let currentScale = 'pentatonic';
let currentMovement = 'ripple';

const pitchScale = scalePitch()
  .domain([0, 4])
  .range(["C3", "G5"])
  .scale(currentScale)
  .root("C");

const gainScale = scaleGain()
  .domain([8, 30])
  .range([0.45, 0.95]);

const panScale = scalePan()
  .domain([-Math.PI, Math.PI])
  .range([-0.85, 0.85]);

const synth = createSynth({ type: "polySynth", volume: -2 });

// Render Outer Arcs
const group = g.append("g")
  .selectAll("g")
  .data(chords.groups)
  .enter()
  .append("g");

group.append("path")
  .attr("class", "group-arc")
  .attr("fill", d => regionColors[d.index])
  .attr("d", arc);

group.append("text")
  .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
  .attr("dy", ".35em")
  .attr("transform", d => `
    rotate(${(d.angle * 180 / Math.PI - 90)})
    translate(${outerRadius + 10})
    ${d.angle > Math.PI ? "rotate(180)" : ""}
  `)
  .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
  .attr("fill", "#94a3b8")
  .attr("font-size", "11px")
  .attr("font-weight", "700")
  .text(d => regionNames[d.index]);

// Render Flow Ribbons
const ribbons = g.append("g")
  .selectAll("path")
  .data(chords)
  .enter()
  .append("path")
  .attr("class", "chord-ribbon")
  .attr("d", ribbon)
  .attr("fill", d => regionColors[d.source.index])
  .attr("stroke", "rgba(0,0,0,0.3)")
  .attr("stroke-width", 1);

// Sonify Ribbon
function sonifyRibbon(d, domElement) {
  const noteSrc = pitchScale(d.source.index);
  const noteTgt = pitchScale(d.target.index);
  const flowVal = d.source.value;
  const vel = gainScale(flowVal);

  const midAngle = (d.source.startAngle + d.target.startAngle) / 2 - Math.PI;
  const pan = panScale(midAngle);

  // Play two-note chord interval
  synth.triggerAttackRelease([noteSrc, noteTgt], "8n", undefined, vel, { pan });

  document.getElementById('chord-status').innerText = `${regionNames[d.source.index]} ➔ ${regionNames[d.target.index]}: [${noteSrc}, ${noteTgt}] (Flow: ${flowVal})`;

  choreography()
    .movement(currentMovement)
    .intensity(flowVal / 18)
    .duration(0.4)(domElement);
}

ribbons.on("mouseenter click", async function(event, d) {
  await defaultEngine.start();
  sonifyRibbon(d, this);
});

// Flow Matrix Tour
let isCycling = false;
let cycleIdx = 0;
let cycleTimer = null;

async function stepCycle() {
  const d = chords[cycleIdx];
  const domNode = ribbons.nodes()[cycleIdx];
  sonifyRibbon(d, domNode);
  cycleIdx = (cycleIdx + 1) % chords.length;
}

const tourBtn = document.getElementById('flow-tour-btn');
tourBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isCycling) {
    clearInterval(cycleTimer);
    isCycling = false;
    tourBtn.innerText = "🌊 Cycle Flow Matrix Chords";
  } else {
    isCycling = true;
    const speed = +document.getElementById('flow-speed').value;
    cycleTimer = setInterval(stepCycle, speed);
    tourBtn.innerText = "⏸ Stop Flow Cycling";
  }
});

document.getElementById('flow-speed').addEventListener('input', (e) => {
  if (isCycling) {
    clearInterval(cycleTimer);
    cycleTimer = setInterval(stepCycle, +e.target.value);
  }
});

document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScale.scale(currentScale);
});

document.getElementById('move-select').addEventListener('change', (e) => {
  currentMovement = e.target.value;
});
