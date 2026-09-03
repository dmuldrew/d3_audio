import {
  scalePitch,
  scaleGain,
  scaleFilter,
  audioLegend,
  choreography,
  defaultEngine,
  createSynth
} from '../../src/index.js';

// 5 Energy streams across 24 hourly time steps (matching table)
const NUM_HOURS = 24;
const keys = ["Fossil", "Nuclear", "Hydro", "Wind", "Solar"];
const keyColors = ["#f43f5e", "#a855f7", "#38bdf8", "#10b981", "#fbbf24"];

// Chord voicings assigned per layer (Bass Root, 5th, Octave, 3rd, 9th)
const chordDegrees = ["C2", "G2", "C3", "E3", "D4"];
const layerDescriptions = [
  "Bass Root (C2) - Baseload Foundation",
  "5th Degree (G2) - Structural Harmony",
  "Octave Root (C3) - Mid Register Anchor",
  "Major 3rd (E3) - Consonance Color",
  "Treble 9th (D4) - Crystalline Shimmer"
];

const rawData = [];
for (let h = 0; h < NUM_HOURS; h++) {
  const t = h / 23;
  rawData.push({
    hour: h,
    Fossil: 40 + Math.cos(t * Math.PI) * 15 + Math.random() * 4,
    Nuclear: 35 + Math.random() * 3,
    Hydro: 25 + Math.sin(t * Math.PI * 2) * 10 + Math.random() * 4,
    Wind: 20 + Math.sin(t * Math.PI * 3) * 15 + Math.random() * 6,
    Solar: Math.max(0, Math.sin(t * Math.PI) * 60 + Math.random() * 5)
  });
}

const container = document.getElementById('stream-area');
const width = container ? (container.clientWidth || 700) : 700;
const height = container ? (container.clientHeight || 420) : 420;

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

// Dynamic layer volume/velocity scale based on GW output
const layerGainScale = scaleGain()
  .domain([0, 75])
  .range([0.25, 0.95]);

// Dynamic Pitch Scalers: Output (GW) ➔ Musical Pitch (C Pentatonic Scale)
// As generation rises, pitch ascends through consonant pentatonic degrees.
const categoryPitchScales = {
  Fossil: scalePitch().domain([20, 60]).range(["C2", "A2"]).scale("pentatonic").root("C"),
  Nuclear: scalePitch().domain([30, 42]).range(["G2", "D3"]).scale("pentatonic").root("C"),
  Hydro: scalePitch().domain([12, 42]).range(["C3", "C4"]).scale("pentatonic").root("C"),
  Wind: scalePitch().domain([5, 45]).range(["E3", "E4"]).scale("pentatonic").root("C"),
  Solar: scalePitch().domain([0, 65]).range(["D3", "D5"]).scale("pentatonic").root("C")
};

const layerInstruments = {
  Fossil: {
    name: "Contrabass",
    icon: "🎻",
    timbre: "Heavy Plucked Low-Strings (Lowpass 420Hz)",
    pan: 0.0,
    duration: "8n",
    pitchRange: "C2 ➔ A2"
  },
  Nuclear: {
    name: "Cathedral Pipe Organ",
    icon: "⛪",
    timbre: "Sustained Harmonic Pipes (AM Modulation)",
    pan: -0.35,
    duration: "4n",
    pitchRange: "G2 ➔ D3"
  },
  Hydro: {
    name: "Wooden Marimba",
    icon: "🪵",
    timbre: "Struck Rosewood Mallet (Fast Acoustic Decay)",
    pan: 0.35,
    duration: "16n",
    pitchRange: "C3 ➔ C4"
  },
  Wind: {
    name: "Pan Flute",
    icon: "🪈",
    timbre: "Breathy Woodwind Aerophone (FM Flutter)",
    pan: -0.70,
    duration: "4n",
    pitchRange: "E3 ➔ E4"
  },
  Solar: {
    name: "Crystal Glockenspiel",
    icon: "🔔",
    timbre: "Struck Metallic Bells (Inharmonic Shimmer)",
    pan: 0.70,
    duration: "8n",
    pitchRange: "D3 ➔ D5"
  }
};

// 5 Distinct acoustic instrument models per energy category
const categorySynths = {};

function getCategorySynth(category) {
  if (!categorySynths[category]) {
    const inst = layerInstruments[category];
    switch (category) {
      case 'Fossil':
        // Contrabass: Thick, heavy lowpass sawtooth string with punchy plucking attack
        categorySynths.Fossil = createSynth({
          type: "polySynth",
          oscillator: "sawtooth",
          cutoff: 420,
          volume: 0,
          pan: inst.pan,
          envelope: { attack: 0.006, decay: 0.35, sustain: 0.45, release: 0.5 }
        });
        break;

      case 'Nuclear':
        // Cathedral Pipe Organ: Majestic, sustained AM dual-pipe harmonic drone
        categorySynths.Nuclear = createSynth({
          type: "amSynth",
          harmonicity: 2.0,
          oscillator: "sine",
          volume: -2.5,
          pan: inst.pan,
          envelope: { attack: 0.06, decay: 0.2, sustain: 0.85, release: 0.9 }
        });
        break;

      case 'Hydro':
        // Wooden Marimba: Struck wooden bar with snappy mallet attack and short organic decay
        categorySynths.Hydro = createSynth({
          type: "polySynth",
          oscillator: "sine",
          cutoff: 2800,
          volume: -0.5,
          pan: inst.pan,
          envelope: { attack: 0.002, decay: 0.22, sustain: 0.02, release: 0.28 }
        });
        break;

      case 'Wind':
        // Pan Flute: Gentle woodwind breath attack with airy FM flutter
        categorySynths.Wind = createSynth({
          type: "fmSynth",
          harmonicity: 1.0,
          modulationIndex: 0.9,
          oscillator: "triangle",
          volume: -3.0,
          pan: inst.pan,
          envelope: { attack: 0.07, decay: 0.3, sustain: 0.65, release: 0.7 }
        });
        break;

      case 'Solar':
        // Crystal Glockenspiel: Struck metallic bar with high inharmonic bell overtones & sparkle
        categorySynths.Solar = createSynth({
          type: "fmSynth",
          harmonicity: 5.4,
          modulationIndex: 6.5,
          oscillator: "sine",
          volume: -2.5,
          pan: inst.pan,
          envelope: { attack: 0.001, decay: 0.9, sustain: 0.04, release: 1.2 }
        });
        break;
    }
  }
  return categorySynths[category];
}

// Ensure audio context starts on user interaction & pre-warm all 5 category synths
async function ensureAudioStarted() {
  try {
    if (window.Tone && typeof Tone.start === 'function') {
      await Tone.start();
    }
    if (window.Tone && Tone.context && Tone.context.state !== 'running') {
      await Tone.context.resume();
    }
    await defaultEngine.start();
    keys.forEach(k => getCategorySynth(k));
    const btns = document.querySelectorAll('#btn-audio-activate, .btn-enable-audio');
    btns.forEach(b => {
      b.innerText = "✓ Audio Active 🔊";
      b.style.background = "#10b981";
      b.style.color = "#030712";
    });
  } catch (err) {
    console.warn("Audio start notice:", err);
  }
}

// Interactive Audio Legend
const audioLegendWidget = audioLegend()
  .title("Streamgraph Dynamic Pitch & Output Key")
  .pitch(categoryPitchScales.Solar, "Solar Output ➔ Glockenspiel Dynamic Pitch (D3 ➔ D5, C Pentatonic)")
  .gain(scaleGain().domain([0, 100]).range([0.25, 0.95]), "Stream Generation / Output Power (GW)");

d3.select("#legend-mount").call(audioLegendWidget);

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

// Solo audition for a single energy stream layer
async function auditionLayer(layerIdx, domElement, atHour = null) {
  await ensureAudioStarted();
  const key = keys[layerIdx];
  const synth = getCategorySynth(key);
  const inst = layerInstruments[key];

  if (atHour !== null && rawData[atHour]) {
    // When clicking a layer directly: audition that layer's exact dynamic pitch at that hour
    const val = rawData[atHour][key];
    const note = categoryPitchScales[key](val);
    synth.triggerAttackRelease(note, "2n", undefined, 0.9, { pan: inst.pan });
    const chordDisplay = document.getElementById('chord-display');
    if (chordDisplay) {
      chordDisplay.innerText = `${inst.icon} Hour ${atHour}:00 ${key}: ${inst.name} [${note}] (${val.toFixed(1)} GW) · ${inst.timbre}`;
    }
  } else {
    // When clicking legend: demonstrate dynamic pitch range with an ascending 3-note arpeggio!
    const dom = categoryPitchScales[key].domain();
    const lowVal = dom[0];
    const midVal = (dom[0] + dom[1]) / 2;
    const highVal = dom[1];
    const nLow = categoryPitchScales[key](lowVal);
    const nMid = categoryPitchScales[key](midVal);
    const nHigh = categoryPitchScales[key](highVal);

    synth.triggerAttackRelease(nLow, "8n", undefined, 0.7, { pan: inst.pan });
    setTimeout(() => synth.triggerAttackRelease(nMid, "8n", undefined, 0.8, { pan: inst.pan }), 180);
    setTimeout(() => synth.triggerAttackRelease(nHigh, "4n", undefined, 0.95, { pan: inst.pan }), 360);

    const chordDisplay = document.getElementById('chord-display');
    if (chordDisplay) {
      chordDisplay.innerText = `${inst.icon} ${key}: ${inst.name} Dynamic Pitch Ascent [${nLow} ➔ ${nMid} ➔ ${nHigh}] (${inst.pitchRange})`;
    }
  }

  if (domElement) {
    choreography()
      .movement("glow")
      .intensity(1.6)
      .duration(0.45)(domElement);
  }
}

// Click on individual stream layers to solo that layer at that exact hour's generation pitch
layerPaths
  .on('click', async function(event, d) {
    event.stopPropagation();
    const [mx] = d3.pointer(event, svg.node());
    const hourIdx = Math.max(0, Math.min(NUM_HOURS - 1, Math.round(xScale.invert(mx))));
    const layerIdx = keys.indexOf(d.key);
    if (layerIdx >= 0) {
      await auditionLayer(layerIdx, this, hourIdx);
    }
  });

// DOM Color Legend with interactive click-to-audition
const colorLegendContainer = document.getElementById('legend');
if (colorLegendContainer) {
  keys.forEach((k, idx) => {
    const inst = layerInstruments[k];
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.title = `Click to audition ${inst.name} dynamic pitch ascent (${inst.pitchRange})`;
    item.innerHTML = `
      <div class="legend-color" style="background: ${keyColors[idx]};"></div>
      <span>${inst.icon} ${k}: <strong>${inst.name}</strong> (${inst.pitchRange})</span>
    `;
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const layerDom = layerPaths.nodes()[idx];
      await auditionLayer(idx, layerDom);
    });
    colorLegendContainer.appendChild(item);
  });
}

// Audition function for time column (harmonic chord voicer with dynamic pitch modulation)
let lastAuditionedHour = -1;

async function auditionHour(hourIndex, forcePlay = false) {
  if (!forcePlay && hourIndex === lastAuditionedHour) return;
  lastAuditionedHour = hourIndex;

  await ensureAudioStarted();
  const d = rawData[hourIndex];
  if (!d) return;

  const activeNotes = [];

  let totalGW = 0;
  keys.forEach((k, idx) => {
    const val = d[k];
    totalGW += val;
    if (val > 4) {
      // Dynamic Pitch Modulation: note ascends up C Pentatonic scale with output power
      const note = categoryPitchScales[k](val);
      activeNotes.push(`${layerInstruments[k].icon} ${note}`);
      const vel = layerGainScale(val);
      const synth = getCategorySynth(k);
      const inst = layerInstruments[k];
      synth.triggerAttackRelease(note, inst.duration, undefined, vel, { pan: inst.pan });
    }
  });

  const xPos = xScale(hourIndex);
  cursor.attr('opacity', 1).attr('x1', xPos).attr('x2', xPos);

  const chordDisplay = document.getElementById('chord-display');
  if (chordDisplay) {
    chordDisplay.innerText = `Hour ${d.hour}:00 ➔ [${activeNotes.join('  ')}] (${totalGW.toFixed(1)} GW)`;
  }

  // Organic wave choreography on active layers proportional to that hour's energy production
  layerPaths.each(function(layerData, layerIdx) {
    const val = d[keys[layerIdx]];
    if (val > 10) {
      choreography()
        .movement("glow")
        .intensity(val / 40)
        .duration(0.3)(this);
    }
  });
}

// Mouse / Touch interaction on SVG
svg
  .on('pointerdown touchstart click', async function(event) {
    if (event.type === 'touchstart') {
      event.preventDefault();
    }
    await ensureAudioStarted();
    const [mx] = d3.pointer(event, this);
    const hourIdx = Math.max(0, Math.min(NUM_HOURS - 1, Math.round(xScale.invert(mx))));
    auditionHour(hourIdx, true);
  })
  .on('pointermove touchmove', async function(event) {
    if (event.type === 'touchmove') {
      event.preventDefault();
    }
    const [mx] = d3.pointer(event, this);
    const hourIdx = Math.max(0, Math.min(NUM_HOURS - 1, Math.round(xScale.invert(mx))));
    if (hourIdx !== lastAuditionedHour) {
      auditionHour(hourIdx, false);
    }
  })
  .on('pointerleave touchend touchcancel', function() {
    if (!isSweeping) {
      cursor.attr('opacity', 0);
      lastAuditionedHour = -1;
    }
  });

// Auto Sweep
let isSweeping = false;
let sweepIdx = 0;
let sweepTimer = null;

const playBtn = document.getElementById('play-stream-btn');
if (playBtn) {
  const toggleSweep = async (e) => {
    if (e) e.stopPropagation();
    await ensureAudioStarted();

    if (isSweeping) {
      clearInterval(sweepTimer);
      isSweeping = false;
      cursor.attr('opacity', 0);
      lastAuditionedHour = -1;
      playBtn.innerText = "▶ Sweep Time Harmonic Chords";
    } else {
      isSweeping = true;
      sweepIdx = 0;
      playBtn.innerText = "⏸ Stop Harmonic Sweep";
      auditionHour(sweepIdx, true);
      sweepIdx = (sweepIdx + 1) % NUM_HOURS;
      sweepTimer = setInterval(() => {
        auditionHour(sweepIdx, true);
        sweepIdx = (sweepIdx + 1) % NUM_HOURS;
      }, 340);
    }
  };

  playBtn.addEventListener('click', toggleSweep);
  playBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    toggleSweep(e);
  });
}
