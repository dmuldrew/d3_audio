import {
  scalePitch,
  scaleGain,
  scalePan,
  audioLegend,
  choreography,
  defaultEngine,
  createSynth,
  midiToNote
} from '../../src/index.js';

// Station Definitions & Synthesizer Voices
// Each station is anchored to its own distinct octave register (Bass C2, Tenor C3, Alto C4, Soprano C5)
// and stereo pan position. This allows all 4 notes to be played simultaneously while remaining
// 100% individually distinguishable by the listener's ear without frequency masking!
const stations = [
  { id: "downtown", name: "Financial District (3rd & Pike)", color: "#38bdf8", baseBikes: 16, voice: "fm", baseMidi: 72, pan: -0.75, role: "Soprano (C5 Bell)" },
  { id: "university", name: "University of Washington Hub", color: "#a855f7", baseBikes: 20, voice: "pluck", baseMidi: 60, pan: -0.25, role: "Alto (C4 Marimba)" },
  { id: "waterfront", name: "Waterfront Pier 69", color: "#f97316", baseBikes: 14, voice: "lead", baseMidi: 48, pan: 0.25, role: "Tenor (C3 Lead)" },
  { id: "residential", name: "Capitol Hill Residential", color: "#10b981", baseBikes: 18, voice: "bass", baseMidi: 36, pan: 0.75, role: "Bass (C2 Sub)" }
];

// Generate 96 15-minute intervals for Weekday vs Holiday
function generateDailyProfiles() {
  const weekday = [];
  const holiday = [];

  for (let i = 0; i < 96; i++) {
    const hour = i / 4; // 0.00 to 23.75
    const min = (i % 4) * 15;
    const timeStr = `${Math.floor(hour).toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

    // 1. Weekday Commute (April 1st): Sharp 8 AM and 5:30 PM rushes
    const morningRush = Math.exp(-Math.pow((hour - 8.2) / 1.2, 2));
    const eveningRush = Math.exp(-Math.pow((hour - 17.5) / 1.4, 2));
    const lunchLull = Math.exp(-Math.pow((hour - 12.5) / 1.5, 2));

    const wDt = Math.round(16 + morningRush * 12 - eveningRush * 10 + lunchLull * 3);
    const wUniv = Math.round(20 + morningRush * 10 - eveningRush * 8);
    const wWater = Math.round(14 + lunchLull * 8 + eveningRush * 4);
    const wRes = Math.round(18 - morningRush * 14 + eveningRush * 12);

    weekday.push({ interval: i, time: timeStr, hour, downtown: wDt, university: wUniv, waterfront: wWater, residential: wRes });

    // 2. Holiday Leisure (July 4th): Afternoon and fireworks surge
    const afternoonWave = Math.exp(-Math.pow((hour - 15.0) / 3.0, 2));
    const fireworksWave = Math.exp(-Math.pow((hour - 21.5) / 1.5, 2));

    const hDt = Math.round(16 - afternoonWave * 6);
    const hUniv = Math.round(20 - afternoonWave * 4);
    const hWater = Math.round(14 + afternoonWave * 15 + fireworksWave * 8);
    const hRes = Math.round(18 - afternoonWave * 8 + fireworksWave * 4);

    holiday.push({ interval: i, time: timeStr, hour, downtown: hDt, university: hUniv, waterfront: hWater, residential: hRes });
  }

  return { weekday, holiday };
}

const profiles = generateDailyProfiles();
let currentMode = "weekday"; // "weekday" or "holiday"
let activeData = profiles.weekday;

// D3 Canvas Setup
const container = document.getElementById('bike-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 480;
const margin = { top: 30, right: 30, bottom: 40, left: 45 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g')
  .attr('transform', `translate(${margin.left}, ${margin.top})`);

const xScale = d3.scaleLinear().domain([0, 95]).range([0, innerW]);
const yScale = d3.scaleLinear().domain([0, 35]).range([innerH, 0]);

// Axes
const xAxis = d3.axisBottom(xScale)
  .tickValues([0, 16, 32, 48, 64, 80, 95])
  .tickFormat(d => `${Math.floor(d / 4)}:00`);

g.append('g')
  .attr('transform', `translate(0, ${innerH})`)
  .call(xAxis)
  .attr('color', '#64748b');

g.append('g')
  .call(d3.axisLeft(yScale).ticks(6))
  .attr('color', '#64748b');

// Midnight Baseline Guideline
g.append('line')
  .attr('x1', 0).attr('x2', innerW)
  .attr('y1', yScale(16)).attr('y2', yScale(16))
  .attr('stroke', 'rgba(255,255,255,0.12)')
  .attr('stroke-dasharray', '3 3');

g.append('text')
  .attr('x', 5).attr('y', yScale(16) - 5)
  .attr('fill', '#94a3b8')
  .attr('font-size', '10px')
  .text("Middle C (C4) Midnight Baseline");

// Synthesizer Instruments with crisp, punchy, percussive envelopes
// Shorter decay and release ensure clean silence between notes, avoiding muddy drone
const synthFM = createSynth({
  type: "fmSynth",
  harmonicity: 2.0,
  volume: -2,
  envelope: { attack: 0.005, decay: 0.12, sustain: 0.0, release: 0.08 }
});
const synthPluck = createSynth({
  type: "pluckSynth",
  volume: -1
});
const synthLead = createSynth({
  type: "polySynth",
  volume: -3,
  oscillator: { type: "triangle" },
  envelope: { attack: 0.005, decay: 0.12, sustain: 0.0, release: 0.08 }
});
const synthBass = createSynth({
  type: "polySynth",
  volume: -2,
  oscillator: { type: "sine" },
  envelope: { attack: 0.008, decay: 0.15, sustain: 0.0, release: 0.08 }
});

const stationSynths = {
  downtown: synthFM,
  university: synthPluck,
  waterfront: synthLead,
  residential: synthBass
};

// Playhead Indicator
const playhead = g.append('line')
  .attr('class', 'playhead-cursor')
  .attr('y1', 0).attr('y2', innerH)
  .attr('x1', 0).attr('x2', 0);

// Visual Station Note Markers on the Playhead
const stationMarkers = {};
stations.forEach(st => {
  stationMarkers[st.id] = g.append('circle')
    .attr('r', 5)
    .attr('fill', st.color)
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .style('opacity', 0);
});

// Draw Station Paths
const lineGenerator = (key) => d3.line()
  .x(d => xScale(d.interval))
  .y(d => yScale(d[key]))
  .curve(d3.curveMonotoneX);

let lines = {};
stations.forEach(st => {
  lines[st.id] = g.append('path')
    .attr('class', 'station-line')
    .attr('stroke', st.color);
});

function updateChart() {
  activeData = profiles[currentMode];
  stations.forEach(st => {
    lines[st.id]
      .datum(activeData)
      .transition()
      .duration(400)
      .attr('d', lineGenerator(st.id));
  });
}

updateChart();

// Interactive Audio Legend Mount
const pitchScale = scalePitch().domain([0, 35]).range(["C2", "G5"]).root("C");
const legend = audioLegend()
  .title("Pronto Station Data ⬄ Sound Key")
  .pitch(pitchScale, "Available Bikes (Delta from Middle C4)")
  .gain(scaleGain().domain([0, 35]).range([0.4, 0.95]), "Dock Station Capacity")
  .pan(scalePan().domain([0, 3]).range([-0.8, 0.8]), "Geographic Spatial Panning");

d3.select("#legend-mount").call(legend);

// Track playback state & voicing mode
let soloStation = "simultaneous"; // "simultaneous", "arpeggiated", "downtown", "university", "waterfront", "residential"
let stepIntervalMs = 500;
let isPlaying = false;
let currentInterval = 0;
let playTimer = null;
let activeTimeouts = [];

function clearSubTimeouts() {
  activeTimeouts.forEach(t => clearTimeout(t));
  activeTimeouts = [];
}

// Sonify a 15-Minute Time Interval
function sonifyInterval(idx) {
  clearSubTimeouts();
  const row = activeData[idx];
  const xPos = xScale(idx);

  playhead.attr('x1', xPos).attr('x2', xPos);

  // Update Clock HUD
  const hr = Math.floor(row.hour);
  const min = (idx % 4) * 15;
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const displayHr = hr % 12 === 0 ? 12 : hr % 12;
  document.getElementById('clock-time').innerText = `${displayHr}:${min.toString().padStart(2, '0')} ${ampm}`;
  document.getElementById('measure-time').innerText = `Measure ${Math.floor(idx / 4) + 1} / 24`;

  const statusEl = document.getElementById('commute-status');
  if (hr >= 7 && hr <= 9) statusEl.innerText = "🚨 Morning Rush Hour Surge";
  else if (hr >= 16 && hr <= 18) statusEl.innerText = "🌆 Evening Commuter Return";
  else if (hr >= 12 && hr <= 14) statusEl.innerText = "🥪 Midday Lunch Transit";
  else statusEl.innerText = "🌙 Off-Peak Steady Flow";

  // Trigger individual station notes
  if (soloStation === "simultaneous") {
    // ⚡ ALL 4 NOTES AT THE EXACT SAME TIME:
    // Each station triggers at the exact same millisecond across its own octave band (C2, C3, C4, C5)
    // with distinct pan and timbre. Every note is individually audible in full polyphonic harmony!
    stations.forEach(st => {
      const bikes = row[st.id];
      const delta = bikes - st.baseBikes;
      const midiNote = st.baseMidi + delta;
      const note = midiToNote(Math.max(24, Math.min(96, midiNote)));
      const s = stationSynths[st.id];

      s.triggerAttackRelease(note, "16n", undefined, 0.75, { pan: st.pan });

      // Visual flash marker on playhead
      const marker = stationMarkers[st.id];
      marker.style('opacity', 1)
        .attr('cx', xPos)
        .attr('cy', yScale(bikes))
        .attr('r', 8)
        .transition()
        .duration(200)
        .attr('r', 4.5);
    });
  } else if (soloStation === "arpeggiated") {
    // 🎼 ARPEGGIATED CASCADE: Staggered across 16th-note sub-beats
    const subDelay = Math.min(110, stepIntervalMs / 4.5);

    stations.forEach((st, sIdx) => {
      const tId = setTimeout(() => {
        const bikes = row[st.id];
        const delta = bikes - st.baseBikes;
        const midiNote = st.baseMidi + delta;
        const note = midiToNote(Math.max(24, Math.min(96, midiNote)));
        const s = stationSynths[st.id];

        s.triggerAttackRelease(note, "16n", undefined, 0.75, { pan: st.pan });

        const marker = stationMarkers[st.id];
        marker.style('opacity', 1)
          .attr('cx', xPos)
          .attr('cy', yScale(bikes))
          .attr('r', 7.5)
          .transition()
          .duration(200)
          .attr('r', 4.5);
      }, sIdx * subDelay);

      activeTimeouts.push(tId);
    });
  } else {
    // 🎯 SOLO STATION MODE: Isolates only the chosen station
    const st = stations.find(s => s.id === soloStation);
    if (!st) return;
    const bikes = row[st.id];
    const delta = bikes - st.baseBikes;
    const midiNote = 60 + delta; // Middle C solo reference
    const note = midiToNote(Math.max(36, Math.min(84, midiNote)));
    const s = stationSynths[st.id];

    s.triggerAttackRelease(note, "16n", undefined, 0.85, { pan: 0 });

    const marker = stationMarkers[st.id];
    marker.style('opacity', 1)
      .attr('cx', xPos)
      .attr('cy', yScale(bikes))
      .attr('r', 8.5)
      .transition()
      .duration(250)
      .attr('r', 4.5);
  }
}

async function stepPlayhead() {
  sonifyInterval(currentInterval);
  document.getElementById('time-slider').value = currentInterval;
  currentInterval = (currentInterval + 1) % 96;
}

const playBtn = document.getElementById('play-day-btn');
playBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isPlaying) {
    clearInterval(playTimer);
    clearSubTimeouts();
    isPlaying = false;
    playBtn.innerText = "▶ Run 24-Hour Symphony";
  } else {
    isPlaying = true;
    playTimer = setInterval(stepPlayhead, stepIntervalMs);
    playBtn.innerText = "⏸ Pause Day Symphony";
  }
});

document.getElementById('time-slider').addEventListener('input', async (e) => {
  await defaultEngine.start();
  currentInterval = +e.target.value;
  sonifyInterval(currentInterval);
});

// Speed Slider
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
speedSlider.addEventListener('input', () => {
  stepIntervalMs = +speedSlider.value;
  const bpm = Math.round((60 / (stepIntervalMs / 1000)));
  speedVal.innerText = `${stepIntervalMs}ms (${bpm} BPM)`;
  if (isPlaying) {
    clearInterval(playTimer);
    playTimer = setInterval(stepPlayhead, stepIntervalMs);
  }
});

// Solo Station Buttons
document.querySelectorAll('.btn-station-solo').forEach(btn => {
  btn.addEventListener('click', async () => {
    await defaultEngine.start();
    document.querySelectorAll('.btn-station-solo').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    soloStation = btn.getAttribute('data-station');

    // Update path opacities to highlight soloed station
    stations.forEach(st => {
      if (soloStation === "simultaneous" || soloStation === "arpeggiated" || soloStation === st.id) {
        lines[st.id].style('opacity', 1).style('stroke-width', soloStation === st.id ? '4px' : '2.5px');
      } else {
        lines[st.id].style('opacity', 0.2).style('stroke-width', '1.5px');
      }
    });

    // Audition immediately
    sonifyInterval(currentInterval);
  });
});

// Toggle Scenarios
const btnWeekday = document.getElementById('btn-weekday');
const btnHoliday = document.getElementById('btn-holiday');

btnWeekday.addEventListener('click', () => {
  currentMode = "weekday";
  btnWeekday.classList.add('active');
  btnHoliday.classList.remove('active');
  document.getElementById('traffic-badge').innerText = "April 1st (Weekday Commute)";
  updateChart();
});

btnHoliday.addEventListener('click', () => {
  currentMode = "holiday";
  btnHoliday.classList.add('active');
  btnWeekday.classList.remove('active');
  document.getElementById('traffic-badge').innerText = "July 4th (Independence Day)";
  updateChart();
});
