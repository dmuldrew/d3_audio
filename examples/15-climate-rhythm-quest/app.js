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

import {
  HISTORICAL_CLIMATE_DATA,
  IPCC_PROJECTIONS
} from './climateData.js';

let currentMode = 'ipcc'; // 'ipcc' | 'sandbox'
let activeScenario = 'ssp585'; // Default to Worst-Case First!
let activePolicies = new Set();

function getActiveRecords() {
  const scenarioKey = currentMode === 'sandbox' ? 'ssp585' : activeScenario;
  const future = IPCC_PROJECTIONS[scenarioKey] || [];
  return [...HISTORICAL_CLIMATE_DATA, ...future];
}

let climateRecords = getActiveRecords();

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
  { val: 2.0, label: "+2.0°C Danger Zone", color: "#ef4444", dash: "3 3", width: 1.4 },
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
    .attr('opacity', t.val === 2.0 ? 0.9 : 0.6);

  g.append('text')
    .attr('x', 5)
    .attr('y', -rScale(t.val) - 3)
    .attr('fill', t.color)
    .attr('font-size', '9px')
    .attr('font-weight', t.val === 2.0 ? '800' : '500')
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
  if (currentMode === 'sandbox' && rec.year > 2026) {
    if (activePolicies.has('renewables')) a -= 0.40;
    if (activePolicies.has('reforestation')) a -= 0.30;
    if (activePolicies.has('methane')) a -= 0.25;
    if (activePolicies.has('industry')) a -= 0.35;
  }
  return +a.toFixed(2);
}

// Current needle / radial line trace
let currentYearIndex = 0;
const needle = g.append('line')
  .attr('stroke', '#facc15')
  .attr('stroke-width', 2.5)
  .attr('opacity', 0);

const needleDot = g.append('circle')
  .attr('r', 4.5)
  .attr('fill', '#facc15')
  .attr('stroke', '#070c18')
  .attr('stroke-width', 1.5)
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
    let projColor = '#f43f5e'; // Default Worst-Case
    if (currentMode === 'sandbox') {
      const netLast = projPoints[projPoints.length - 1].netA;
      projColor = netLast <= 1.5 ? '#10b981' : (netLast <= 2.0 ? '#f59e0b' : '#f43f5e');
    } else {
      if (activeScenario === 'ssp245') projColor = '#f59e0b';
      if (activeScenario === 'ssp126') projColor = '#10b981';
    }

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
      .attr('stroke', '#facc15');

    needleDot
      .attr('opacity', 1)
      .attr('cx', lastPt.x)
      .attr('cy', lastPt.y);
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
      yearTag.innerText = "Historical Observed (NASA GISS)";
      yearTag.style.background = "rgba(56, 189, 248, 0.15)";
      yearTag.style.color = "#38bdf8";
    } else if (currentMode === 'sandbox') {
      const offset = (activePolicies.has('renewables') ? 0.4 : 0) +
        (activePolicies.has('reforestation') ? 0.3 : 0) +
        (activePolicies.has('methane') ? 0.25 : 0) +
        (activePolicies.has('industry') ? 0.35 : 0);
      yearTag.innerText = offset > 0 ? `Policy Sandbox (-${offset.toFixed(2)}°C Offset)` : "Sandbox (Worst-Case Baseline)";
      yearTag.style.background = offset > 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)";
      yearTag.style.color = offset > 0 ? "#10b981" : "#f43f5e";
    } else {
      let scName = "SSP5-8.5 (Worst-Case)";
      let scColor = "#f43f5e";
      if (activeScenario === 'ssp245') { scName = "SSP2-4.5 (Pledges)"; scColor = "#f59e0b"; }
      if (activeScenario === 'ssp126') { scName = "SSP1-2.6 (Net-Zero)"; scColor = "#10b981"; }
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
  } else if (rec.year > 2050 && (activeScenario === 'ssp126' || netA <= 1.4)) {
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

// Mode Tabs: Switch between Official IPCC Pathways and Policy Sandbox
const tabIpcc = document.getElementById('tab-ipcc-mode');
const tabSandbox = document.getElementById('tab-sandbox-mode');
const secIpcc = document.getElementById('section-ipcc');
const secSandbox = document.getElementById('section-sandbox');

if (tabIpcc && tabSandbox) {
  tabIpcc.addEventListener('click', async () => {
    await defaultEngine.start();
    currentMode = 'ipcc';
    tabIpcc.classList.add('active');
    tabIpcc.style.background = 'var(--accent)';
    tabIpcc.style.color = '#030712';
    tabSandbox.classList.remove('active');
    tabSandbox.style.background = 'transparent';
    tabSandbox.style.color = 'var(--muted)';
    if (secIpcc) secIpcc.style.display = 'block';
    if (secSandbox) secSandbox.style.display = 'none';

    climateRecords = getActiveRecords();
    renderSpiralUpTo(currentYearIndex);
    sonifyYear(climateRecords[currentYearIndex]);
  });

  tabSandbox.addEventListener('click', async () => {
    await defaultEngine.start();
    currentMode = 'sandbox';
    tabSandbox.classList.add('active');
    tabSandbox.style.background = 'var(--accent)';
    tabSandbox.style.color = '#030712';
    tabIpcc.classList.remove('active');
    tabIpcc.style.background = 'transparent';
    tabIpcc.style.color = 'var(--muted)';
    if (secIpcc) secIpcc.style.display = 'none';
    if (secSandbox) secSandbox.style.display = 'block';

    climateRecords = getActiveRecords();
    renderSpiralUpTo(currentYearIndex);
    sonifyYear(climateRecords[currentYearIndex]);
  });
}

// IPCC Scenario Switcher Buttons (Sorted Worse Cases First)
document.querySelectorAll('.btn-scenario').forEach(btn => {
  btn.addEventListener('click', async () => {
    await defaultEngine.start();
    const sc = btn.getAttribute('data-scenario');
    activeScenario = sc;
    document.querySelectorAll('.btn-scenario').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Rebuild full records with verified IPCC CMIP6 projection tables
    climateRecords = getActiveRecords();
    renderSpiralUpTo(currentYearIndex);
    sonifyYear(climateRecords[currentYearIndex]);
  });
});

// Dynamic Policy Buttons (For Sandbox Mode)
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
