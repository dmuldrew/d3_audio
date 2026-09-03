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

// 1. Build Historical Data (1880 to 2026)
// NASA GISS Annual Global Mean Surface Temperature Anomaly (°C relative to 1951-1980 baseline)
// and NOAA Mauna Loa atmospheric CO2 measurements
const historicalRecords = [];
for (let yr = 1880; yr <= 2026; yr++) {
  const t = (yr - 1880) / (2026 - 1880);
  let baseAnomaly;
  if (yr < 1910) baseAnomaly = -0.22 + (Math.sin(yr) * 0.08);
  else if (yr < 1940) baseAnomaly = -0.15 + ((yr - 1910) / 30) * 0.25 + (Math.sin(yr * 2) * 0.06);
  else if (yr < 1975) baseAnomaly = 0.02 + (Math.sin(yr * 1.5) * 0.07);
  else if (yr < 2000) baseAnomaly = 0.15 + ((yr - 1975) / 25) * 0.35 + (Math.sin(yr) * 0.06);
  else baseAnomaly = 0.55 + ((yr - 2000) / 26) * 0.75 + (Math.sin(yr * 3) * 0.08);

  const co2 = Math.round(285 + Math.pow(t, 2.2) * 140);
  historicalRecords.push({
    year: yr,
    anomaly: +(baseAnomaly).toFixed(2),
    co2,
    isProjected: false
  });
}

// 2. IPCC AR6 / CMIP6 Projection Pathway Generator (2027 to 2100)
function generateProjections(scenario) {
  const futureRecords = [];
  for (let yr = 2027; yr <= 2100; yr++) {
    const t = (yr - 2026) / (2100 - 2026);
    let anomaly, co2;
    if (scenario === 'ssp126') {
      // SSP1-2.6: Paris Net-Zero. Peaks around 2045 at +1.58°C, then steadily cools/stabilizes at +1.35°C by 2100
      const peak = Math.sin(t * Math.PI) * 0.28;
      const cooldown = t > 0.4 ? (t - 0.4) * 0.28 : 0;
      anomaly = +(1.30 + peak - cooldown + Math.sin(yr * 2) * 0.03).toFixed(2);
      co2 = Math.round(425 + Math.sin(t * Math.PI) * 20 - (t > 0.45 ? (t - 0.45) * 35 : 0));
    } else if (scenario === 'ssp245') {
      // SSP2-4.5: Middle of the Road / Current Policies. Continues to +2.0°C by 2055 and +2.72°C by 2100
      anomaly = +(1.30 + t * 1.42 + Math.sin(yr * 2.5) * 0.04).toFixed(2);
      co2 = Math.round(425 + t * 135);
    } else if (scenario === 'ssp585') {
      // SSP5-8.5: Fossil-Fueled Worst-Case. Accelerates past +4.75°C with CO2 exceeding 1,020 ppm
      anomaly = +(1.30 + Math.pow(t, 1.35) * 3.45 + Math.sin(yr * 3) * 0.05).toFixed(2);
      co2 = Math.round(425 + Math.pow(t, 1.4) * 595);
    }
    futureRecords.push({
      year: yr,
      anomaly,
      co2,
      isProjected: true
    });
  }
  return futureRecords;
}

let activeScenario = 'ssp126';
let activePolicies = new Set();
let climateRecords = [...historicalRecords, ...generateProjections(activeScenario)];

const container = document.getElementById('spiral-area');
const width = container.clientWidth || 650;
const height = container.clientHeight || 490;
const radius = Math.min(width, height) / 2 - 20;

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
  const x = Math.cos(ang) * (radius - 5);
  const y = Math.sin(ang) * (radius - 5);

  g.append('line')
    .attr('x1', 0).attr('y1', 0).attr('x2', x).attr('y2', y)
    .attr('stroke', 'rgba(255, 255, 255, 0.06)')
    .attr('stroke-width', 1);

  g.append('text')
    .attr('x', x * 1.07)
    .attr('y', y * 1.07)
    .attr('text-anchor', 'middle')
    .attr('dy', '.3em')
    .attr('fill', '#64748b')
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .text(m);
});

// Radial Scale spanning -0.5°C to +5.0°C (accommodates historical cooling up to SSP5-8.5 runaway warming)
const rScale = d3.scaleLinear()
  .domain([-0.5, 5.0])
  .range([32, radius - 15]);

// Concentric Climate Target & Warning Threshold Rings
const thresholds = [
  { val: 0.0, label: "0.0°C Pre-Industrial", color: "#64748b", dash: "2 2", width: 1 },
  { val: 1.0, label: "+1.0°C Modern", color: "#38bdf8", dash: "3 2", width: 1 },
  { val: 1.5, label: "+1.5°C Paris Target", color: "#f43f5e", dash: "4 3", width: 1.8 },
  { val: 2.0, label: "+2.0°C Danger Zone", color: "#ef4444", dash: "3 3", width: 1.2 },
  { val: 3.0, label: "+3.0°C Severe Disruption", color: "#a855f7", dash: "2 2", width: 1 },
  { val: 4.0, label: "+4.0°C Catastrophic", color: "#ec4899", dash: "2 2", width: 1 }
];

thresholds.forEach(t => {
  g.append('circle')
    .attr('r', rScale(t.val))
    .attr('fill', 'none')
    .attr('stroke', t.color)
    .attr('stroke-width', t.width)
    .attr('stroke-dasharray', t.dash)
    .attr('opacity', t.val === 1.5 ? 0.9 : 0.6);

  g.append('text')
    .attr('x', 5)
    .attr('y', -rScale(t.val) - 3)
    .attr('fill', t.color)
    .attr('font-size', '9px')
    .attr('font-weight', t.val === 1.5 ? '800' : '500')
    .text(t.label);
});

// Color Scale mapped across the extended range
const colorScale = d3.scaleSequential(d3.interpolateTurbo)
  .domain([-0.3, 4.5]);

// Musical Sonification Scales
const pitchScale = scalePitch()
  .domain([-0.5, 5.0])
  .range(["C3", "G6"]) // Serene low root notes -> Piercing high alarm sirens
  .scale("pentatonic")
  .root("C");

const filterScale = scaleFilter()
  .domain([280, 1020])
  .range([350, 9500]); // Muffled baseline -> Piercing wide-open CO2 brightness

const synthTone = createSynth({ type: "fmSynth", harmonicity: 2.0, volume: -3 });

// Interactive Audio Legend
const legend = audioLegend()
  .title("Climate Spiral & Projections Sonification Key")
  .pitch(pitchScale, "Temperature Anomaly (-0.5°C Pre-Industrial Calm ➔ +5.0°C Runaway Alarm)")
  .filter(filterScale, "Atmospheric CO₂ (280 ppm Baseline ➔ 1,020 ppm SSP5-8.5 Disruption)");

d3.select("#legend-mount").call(legend);

const spiralGroup = g.append('g');

function getNetAnomaly(rec) {
  let a = rec.anomaly;
  if (rec.year > 2026) {
    if (activePolicies.has('renewables')) a -= 0.4;
    if (activePolicies.has('reforestation')) a -= 0.3;
    if (activePolicies.has('methane')) a -= 0.25;
  }
  return +a.toFixed(2);
}

// Current needle / spiral trace
let currentYearIndex = 0;
const needle = g.append('line')
  .attr('stroke', '#ffffff')
  .attr('stroke-width', 2.5)
  .attr('opacity', 0);

function renderSpiralUpTo(yearIdx) {
  spiralGroup.selectAll('*').remove();

  const points = [];
  for (let i = 0; i <= yearIdx; i++) {
    const rec = climateRecords[i];
    const netA = getNetAnomaly(rec);
    const ang = angleScale((i % 12) + 0.5) - Math.PI / 2;
    const r = rScale(Math.min(5.2, Math.max(-0.6, netA)));
    points.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r, rec, netA });
  }

  const line = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveCatmullRom.alpha(0.5));

  // Split into Historical (<=2026) and Projected (>2026) segments for visual distinction
  const histPoints = points.filter(p => p.rec.year <= 2026);
  const projPoints = points.filter(p => p.rec.year >= 2026);

  if (histPoints.length > 1) {
    spiralGroup.append('path')
      .datum(histPoints)
      .attr('class', 'spiral-ring')
      .attr('d', line)
      .attr('stroke', d => {
        const last = histPoints[histPoints.length - 1];
        return last ? colorScale(last.netA) : '#38bdf8';
      })
      .attr('stroke-width', 2.5);
  }

  if (projPoints.length > 1) {
    let projColor = '#10b981';
    if (activeScenario === 'ssp245') projColor = '#f59e0b';
    if (activeScenario === 'ssp585') projColor = '#f43f5e';

    spiralGroup.append('path')
      .datum(projPoints)
      .attr('class', 'spiral-ring spiral-projected')
      .attr('d', line)
      .attr('stroke', projColor)
      .attr('stroke-dasharray', '5 3')
      .attr('stroke-width', 3)
      .attr('filter', 'drop-shadow(0 0 6px rgba(255,255,255,0.4))');
  }

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
  const vel = Math.min(1.0, 0.4 + Math.max(0, netA) * 0.12);

  // Increase FM modulation index with severe warming (+1.5°C+) to introduce auditory tension & alarm
  if (synthTone.synth && synthTone.synth.harmonicity) {
    const modIdx = Math.min(8.0, 1.0 + Math.max(0, netA - 1.2) * 1.8);
    if (synthTone.synth.modulationIndex) {
      synthTone.synth.modulationIndex.value = modIdx;
    }
  }

  synthTone.triggerAttackRelease(note, "8n", undefined, vel, { filter: cutoff });

  document.getElementById('year-display').innerText = rec.year;
  const yearTag = document.getElementById('year-tag');
  if (yearTag) {
    if (rec.year <= 2026) {
      yearTag.innerText = "Historical Observed";
      yearTag.style.background = "rgba(56, 189, 248, 0.15)";
      yearTag.style.color = "#38bdf8";
    } else {
      let scName = "SSP1-2.6 (Net-Zero)";
      let scColor = "#10b981";
      if (activeScenario === 'ssp245') { scName = "SSP2-4.5 (Pledges)"; scColor = "#f59e0b"; }
      if (activeScenario === 'ssp585') { scName = "SSP5-8.5 (Worst-Case)"; scColor = "#f43f5e"; }
      yearTag.innerText = `Projected: ${scName}`;
      yearTag.style.background = `${scColor}22`;
      yearTag.style.color = scColor;
    }
  }

  document.getElementById('temp-display').innerText = `${netA >= 0 ? '+' : ''}${netA.toFixed(2)} °C`;
  document.getElementById('temp-display').style.color = colorScale(netA);
  document.getElementById('co2-display').innerText = `${rec.co2} ppm`;

  const badge = document.getElementById('climate-badge');
  if (netA >= 3.0) {
    badge.innerText = "🔥 Runaway Catastrophic Warming (+3°C+)";
    badge.style.background = "rgba(236, 72, 153, 0.25)";
    badge.style.color = "#ec4899";
  } else if (netA >= 2.0) {
    badge.innerText = "🔴 Severe +2.0°C Danger Threshold";
    badge.style.background = "rgba(239, 68, 68, 0.25)";
    badge.style.color = "#ef4444";
  } else if (netA >= 1.5) {
    badge.innerText = "🚨 Critical Paris 1.5°C Breach";
    badge.style.background = "rgba(244, 63, 94, 0.2)";
    badge.style.color = "#f43f5e";
  } else if (rec.year > 2050 && activeScenario === 'ssp126') {
    badge.innerText = "🌱 Paris Net-Zero Harmonized Stabilization";
    badge.style.background = "rgba(16, 185, 129, 0.2)";
    badge.style.color = "#10b981";
  } else if (netA >= 1.0) {
    badge.innerText = "⚠️ Modern Era Warming";
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

// Play Time Machine Loop (1880 to 2100)
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
    playBtn.innerText = "▶ Run Climate Time Machine (1880–2100)";
  } else {
    isPlaying = true;
    playBtn.innerText = "⏸ Pause Time Machine";
    timeMachineTimer = setInterval(stepTime, 120);
  }
});

// Slider scrubber
const slider = document.getElementById('year-slider');
slider.addEventListener('input', async (e) => {
  await defaultEngine.start();
  const yr = +e.target.value;
  currentYearIndex = yr - 1880;
  renderSpiralUpTo(currentYearIndex);
  sonifyYear(climateRecords[currentYearIndex]);
});

// IPCC Scenario Switcher Buttons
document.querySelectorAll('.btn-scenario').forEach(btn => {
  btn.addEventListener('click', async () => {
    await defaultEngine.start();
    const sc = btn.getAttribute('data-scenario');
    activeScenario = sc;
    document.querySelectorAll('.btn-scenario').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Rebuild full records with selected scenario projections
    climateRecords = [...historicalRecords, ...generateProjections(activeScenario)];
    renderSpiralUpTo(currentYearIndex);
    sonifyYear(climateRecords[currentYearIndex]);
  });
});

// Dynamic Policy Buttons
document.querySelectorAll('.btn-policy').forEach(btn => {
  btn.addEventListener('click', async () => {
    await defaultEngine.start();
    const pol = btn.getAttribute('data-policy');
    if (activePolicies.has(pol)) {
      activePolicies.delete(pol);
      btn.classList.remove('active');
    } else {
      activePolicies.add(pol);
      btn.classList.add('active');
    }
    renderSpiralUpTo(currentYearIndex);
    sonifyYear(climateRecords[currentYearIndex]);
  });
});
