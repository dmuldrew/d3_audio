import {
  scalePitch,
  scaleGain,
  scaleFilter,
  choreography,
  defaultEngine,
  createSynth
} from '/src/index.js';

// 5 Energy streams across 24 hourly time steps
const NUM_HOURS = 24;
const keys = ["Solar", "Wind", "Hydro", "Nuclear", "Biofuel"];
const keyColors = ["#f59e0b", "#06b6d4", "#3b82f6", "#a855f7", "#10b981"];

// Chord voicings assigned per layer (Root, 3rd, 5th, 7th, 9th)
const chordDegrees = ["C3", "E3", "G3", "B3", "D4"];

const rawData = [];
for (let h = 0; h < NUM_HOURS; h++) {
  const t = h / 23;
  rawData.push({
    hour: h,
    Solar: Math.max(0, Math.sin(t * Math.PI) * 60 + Math.random() * 5),
    Wind: 25 + Math.sin(t * Math.PI * 3) * 15 + Math.random() * 8,
    Hydro: 30 + Math.cos(t * Math.PI * 2) * 10 + Math.random() * 4,
    Nuclear: 45 + Math.random() * 5,
    Biofuel: 15 + Math.sin(t * Math.PI * 1.5) * 8 + Math.random() * 3
  });
}

const container = document.getElementById('stream-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 420;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

// D3 Stack Layout with Wiggle offset
const stack = d3.stack()
  .keys(keys)
  .offset(d3.stackOffsetWiggle)
  .order(d3.stackOrderInsideOut);

const series = stack(rawData);

// Scales
const xScale = d3.scaleLinear()
  .domain([0, NUM_HOURS - 1])
  .range([30, width - 30]);

const yMin = d3.min(series, layer => d3.min(layer, d => d[0]));
const yMax = d3.max(series, layer => d3.max(layer, d => d[1]));

const yScale = d3.scaleLinear()
  .domain([yMin, yMax])
  .range([height - 30, 30]);

const colorScale = d3.scaleOrdinal()
  .domain(keys)
  .range(keyColors);

const area = d3.area()
  .x(d => xScale(d.data.hour))
  .y0(d => yScale(d[0]))
  .y1(d => yScale(d[1]))
  .curve(d3.curveBasis);

// PolySynth for 5-voice harmonized chords
const chordSynth = createSynth({
  type: "polySynth",
  volume: -3
});

// Render Stream Layers
const layerPaths = svg.selectAll('.stream-layer')
  .data(series)
  .enter()
  .append('path')
  .attr('class', 'stream-layer')
  .attr('d', area)
  .attr('fill', d => colorScale(d.key));

// Time Cursor
const cursor = svg.append('line')
  .attr('class', 'time-cursor')
  .attr('y1', 20)
  .attr('y2', height - 20)
  .attr('x1', 0)
  .attr('x2', 0)
  .attr('opacity', 0);

// Legend
const legend = document.getElementById('legend');
keys.forEach((k, idx) => {
  const item = document.createElement('div');
  item.className = 'legend-item';
  item.innerHTML = `
    <div class="legend-color" style="background: ${keyColors[idx]};"></div>
    <span>${k} (${chordDegrees[idx]})</span>
  `;
  legend.appendChild(item);
});

// Audition function for time column
async function auditionHour(hourIndex) {
  await defaultEngine.start();
  const d = rawData[hourIndex];
  if (!d) return;

  const notesToPlay = [];
  keys.forEach((k, idx) => {
    const val = d[k];
    if (val > 5) {
      notesToPlay.push(chordDegrees[idx]);
    }
  });

  if (notesToPlay.length > 0) {
    chordSynth.triggerAttackRelease(notesToPlay, "8n", undefined, 0.75);
  }

  const xPos = xScale(hourIndex);
  cursor.attr('opacity', 1).attr('x1', xPos).attr('x2', xPos);

  document.getElementById('chord-display').innerText = `Hour ${d.hour}:00 → [${notesToPlay.join(', ')}]`;

  // Organic wave choreography on layers
  layerPaths.each(function(layerData, layerIdx) {
    choreography()
      .movement("glow")
      .intensity(d[keys[layerIdx]] / 35)
      .duration(0.35)(this);
  });
}

// Mouse interaction
svg.on('mousemove', function(event) {
  const [mx] = d3.pointer(event, this);
  const hourIdx = Math.max(0, Math.min(NUM_HOURS - 1, Math.round(xScale.invert(mx))));
  auditionHour(hourIdx);
});

// Auto Sweep
let isSweeping = false;
let sweepIdx = 0;
let sweepTimer = null;

const playBtn = document.getElementById('play-stream-btn');
playBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isSweeping) {
    clearInterval(sweepTimer);
    isSweeping = false;
    cursor.attr('opacity', 0);
    playBtn.innerText = "▶ Sweep Time Harmonic Chords";
  } else {
    isSweeping = true;
    sweepIdx = 0;
    playBtn.innerText = "⏸ Stop Harmonic Sweep";
    sweepTimer = setInterval(() => {
      auditionHour(sweepIdx);
      sweepIdx = (sweepIdx + 1) % NUM_HOURS;
    }, 280);
  }
});
