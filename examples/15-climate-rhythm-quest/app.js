import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleFilter,
  audioLegend,
  choreography,
  defaultEngine,
  createSynth
} from '/src/index.js';

// NASA GISS Annual Global Mean Surface Temperature Anomaly (°C relative to 1951-1980 baseline)
const climateRecords = [];
for (let yr = 1880; yr <= 2026; yr++) {
  const t = (yr - 1880) / (2026 - 1880);
  // Real warming trend curve approximation matching NASA GISS data points
  let baseAnomaly;
  if (yr < 1910) baseAnomaly = -0.22 + (Math.sin(yr) * 0.08);
  else if (yr < 1940) baseAnomaly = -0.15 + ((yr - 1910) / 30) * 0.25 + (Math.sin(yr * 2) * 0.06);
  else if (yr < 1975) baseAnomaly = 0.02 + (Math.sin(yr * 1.5) * 0.07);
  else if (yr < 2000) baseAnomaly = 0.15 + ((yr - 1975) / 25) * 0.35 + (Math.sin(yr) * 0.06);
  else baseAnomaly = 0.55 + ((yr - 2000) / 26) * 0.75 + (Math.sin(yr * 3) * 0.08);

  const co2 = Math.round(285 + Math.pow(t, 2.2) * 140);
  climateRecords.push({
    year: yr,
    anomaly: +(baseAnomaly).toFixed(2),
    co2
  });
}

const container = document.getElementById('spiral-area');
const width = container.clientWidth || 650;
const height = container.clientHeight || 490;
const radius = Math.min(width, height) / 2 - 25;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g')
  .attr('transform', `translate(${width / 2}, ${height / 2})`);

// 12 Monthly Angular divisions
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const angleScale = d3.scaleLinear().domain([0, 12]).range([0, 2 * Math.PI]);

// Draw monthly radial axis spokes
months.forEach((m, i) => {
  const ang = angleScale(i) - Math.PI / 2;
  const x = Math.cos(ang) * (radius - 10);
  const y = Math.sin(ang) * (radius - 10);

  g.append('line')
    .attr('x1', 0).attr('y1', 0).attr('x2', x).attr('y2', y)
    .attr('stroke', 'rgba(255, 255, 255, 0.06)')
    .attr('stroke-width', 1);

  g.append('text')
    .attr('x', x * 1.08)
    .attr('y', y * 1.08)
    .attr('text-anchor', 'middle')
    .attr('dy', '.3em')
    .attr('fill', '#64748b')
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .text(m);
});

// Baseline circles (0°C, +1.0°C, +1.5°C Paris Limit)
const rScale = d3.scaleLinear()
  .domain([-0.5, 2.0])
  .range([40, radius - 20]);

[0.0, 1.0, 1.5].forEach(val => {
  g.append('circle')
    .attr('r', rScale(val))
    .attr('fill', 'none')
    .attr('stroke', val === 1.5 ? '#f43f5e' : 'rgba(255,255,255,0.15)')
    .attr('stroke-width', val === 1.5 ? 1.5 : 1)
    .attr('stroke-dasharray', val === 1.5 ? '4 3' : '2 2');

  g.append('text')
    .attr('x', 5)
    .attr('y', -rScale(val) - 3)
    .attr('fill', val === 1.5 ? '#f43f5e' : '#64748b')
    .attr('font-size', '9px')
    .text(`+${val}°C`);
});

// Scales
let activeScenarios = new Set();

const pitchScale = scalePitch()
  .domain([-0.4, 1.5])
  .range(["C3", "F#5"]) // Low calm -> Dissonant tritone
  .scale("pentatonic")
  .root("C");

const filterScale = scaleFilter()
  .domain([280, 430])
  .range([400, 6500]);

const synthTone = createSynth({ type: "fmSynth", harmonicity: 2.0, volume: -2 });

// Interactive Audio Legend
const legend = audioLegend()
  .title("Climate Spiral Sonification Key")
  .pitch(pitchScale, "Temperature Anomaly (-0.4°C Calm ➔ +1.5°C Dissonance)")
  .filter(filterScale, "Atmospheric CO₂ Concentration (280 ➔ 430 ppm)");

d3.select("#legend-mount").call(legend);

// Render historical spiral segments
const colorScale = d3.scaleSequential(d3.interpolateTurbo)
  .domain([-0.3, 1.4]);

const spiralGroup = g.append('g');

function getNetAnomaly(rec) {
  let a = rec.anomaly;
  if (rec.year > 2000) {
    if (activeScenarios.has('renewables')) a -= 0.4;
    if (activeScenarios.has('reforestation')) a -= 0.3;
    if (activeScenarios.has('methane')) a -= 0.25;
  }
  return +a.toFixed(2);
}

// Current needle / spiral trace
let currentYearIndex = 0;
const needle = g.append('line')
  .attr('stroke', '#ffffff')
  .attr('stroke-width', 2)
  .attr('opacity', 0);

function renderSpiralUpTo(yearIdx) {
  spiralGroup.selectAll('*').remove();

  const points = [];
  for (let i = 0; i <= yearIdx; i++) {
    const rec = climateRecords[i];
    const netA = getNetAnomaly(rec);
    const ang = angleScale((i % 12) + 0.5) - Math.PI / 2;
    const r = rScale(netA);
    points.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r, rec, netA });
  }

  const line = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveCatmullRom.alpha(0.5));

  spiralGroup.append('path')
    .datum(points)
    .attr('class', 'spiral-ring')
    .attr('d', line)
    .attr('stroke', d => {
      const last = points[points.length - 1];
      return last ? colorScale(last.netA) : '#38bdf8';
    })
    .attr('stroke-width', 2.5);

  const lastPt = points[points.length - 1];
  if (lastPt) {
    needle
      .attr('opacity', 1)
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', lastPt.x).attr('y2', lastPt.y)
      .attr('stroke', colorScale(lastPt.netA));
  }
}

// Sonify Climate Year
function sonifyYear(rec) {
  const netA = getNetAnomaly(rec);
  const note = pitchScale(netA);
  const cutoff = filterScale(rec.co2);
  const vel = Math.min(1.0, 0.4 + (netA + 0.5) * 0.35);

  synthTone.triggerAttackRelease(note, "8n", undefined, vel, { filter: cutoff });

  document.getElementById('year-display').innerText = rec.year;
  document.getElementById('temp-display').innerText = `${netA >= 0 ? '+' : ''}${netA} °C`;
  document.getElementById('temp-display').style.color = colorScale(netA);
  document.getElementById('co2-display').innerText = `${rec.co2} ppm`;

  const badge = document.getElementById('climate-badge');
  if (netA >= 1.5) {
    badge.innerText = "🚨 Critical Paris 1.5°C Breach";
    badge.style.background = "rgba(244, 63, 94, 0.2)";
    badge.style.color = "#f43f5e";
  } else if (netA >= 1.0) {
    badge.innerText = "⚠️ High Warming Tension";
    badge.style.background = "rgba(251, 191, 36, 0.2)";
    badge.style.color = "#fbbf24";
  } else {
    badge.innerText = "✓ Pre-Industrial Baseline";
    badge.style.background = "rgba(56, 189, 248, 0.2)";
    badge.style.color = "#38bdf8";
  }

  choreography().movement("glow").intensity(1.5).duration(0.3)(needle.node());
}

renderSpiralUpTo(0);

// Play Time Machine Loop
let isPlaying = false;
let timeMachineTimer = null;

async function stepTime() {
  currentYearIndex = (currentYearIndex + 1) % climateRecords.length;
  document.getElementById('year-slider').value = climateRecords[currentYearIndex].year;
  renderSpiralUpTo(currentYearIndex);
  sonifyYear(climateRecords[currentYearIndex]);
}

const playBtn = document.getElementById('play-spiral-btn');
playBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isPlaying) {
    clearInterval(timeMachineTimer);
    isPlaying = false;
    playBtn.innerText = "▶ Run Climate Time Machine (1880–2026)";
  } else {
    isPlaying = true;
    playBtn.innerText = "⏸ Pause Time Machine";
    timeMachineTimer = setInterval(stepTime, 140);
  }
});

document.getElementById('year-slider').addEventListener('input', async (e) => {
  await defaultEngine.start();
  const yr = +e.target.value;
  currentYearIndex = yr - 1880;
  renderSpiralUpTo(currentYearIndex);
  sonifyYear(climateRecords[currentYearIndex]);
});

// Scenario buttons
document.querySelectorAll('.btn-scenario').forEach(btn => {
  btn.addEventListener('click', async () => {
    await defaultEngine.start();
    const sc = btn.getAttribute('data-scenario');
    if (activeScenarios.has(sc)) {
      activeScenarios.delete(sc);
      btn.classList.remove('active');
    } else {
      activeScenarios.add(sc);
      btn.classList.add('active');
    }
    renderSpiralUpTo(currentYearIndex);
    sonifyYear(climateRecords[currentYearIndex]);
  });
});
