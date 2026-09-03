// 21. Euclidean Polyrhythms & Algorithmic Groove Engine
import {
  scaleRhythm,
  euclideanRhythm,
  createSynth,
  createSamplePlayer,
  defaultEngine,
  scalePitch
} from '../../src/index.js';

// State & Track Configurations
const tracks = [
  { id: "kick", name: "Kick Drum", pulses: 4, steps: 16, color: "#38bdf8", radius: 180, sample: "kick" },
  { id: "snare", name: "Snare / Rim", pulses: 2, steps: 16, color: "#c084fc", radius: 135, sample: "snare" },
  { id: "hihat", name: "Hi-Hat", pulses: 8, steps: 16, color: "#fbbf24", radius: 95, sample: "hihat" },
  { id: "marimba", name: "Marimba Pluck", pulses: 5, steps: 16, color: "#10b981", radius: 55, synth: true }
];

const pitchScale = scalePitch().domain([0, 15]).range(["C4", "C5"]).scale("pentatonic");

let currentStep = 0;
let isPlaying = false;
let clockTimer = null;
let audioActive = false;
let drums = null;
let melodySynth = null;
let trafficSimulationActive = false;
let trafficInterval = null;

// DOM Elements
const svg = d3.select("#radar-svg");
const container = document.getElementById("radar-container");
const btnAudioActivate = document.getElementById("btn-audio-activate");
const btnPlay = document.getElementById("btn-play-toggle");
const btnTraffic = document.getElementById("btn-simulate-traffic");
const bpmSlider = document.getElementById("bpm-slider");
const bpmVal = document.getElementById("bpm-val");
const activeBadge = document.getElementById("active-badge");

// Initialize Audio
async function initAudio() {
  try {
    await defaultEngine.start();
    audioActive = true;
    if (btnAudioActivate) {
      btnAudioActivate.innerText = "✓ Audio Engine Active 🔊";
      btnAudioActivate.style.background = "#10b981";
      btnAudioActivate.style.color = "#030712";
    }

    if (!drums) {
      drums = createSamplePlayer();
    }
    if (!melodySynth) {
      melodySynth = createSynth({
        type: "pluckSynth",
        volume: -4
      });
    }
  } catch (err) {
    console.warn("Audio initialization warning:", err);
  }
}

// Compute Euclidean Pattern for Track
function getTrackPattern(track) {
  return euclideanRhythm(track.pulses, track.steps);
}

// Render Concentric Radar
function renderRadar() {
  svg.selectAll("*").remove();

  const rect = container.getBoundingClientRect();
  const w = Math.max(340, rect.width || 560);
  const h = Math.max(340, rect.height || 480);
  const cx = w / 2;
  const cy = h / 2;

  const g = svg.append("g").attr("transform", `translate(${cx}, ${cy})`);

  // Background ambient circles
  tracks.forEach(t => {
    g.append("circle")
      .attr("r", t.radius)
      .attr("fill", "none")
      .attr("stroke", t.color)
      .attr("stroke-opacity", 0.15)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3 3");
  });

  // Render Beads for each track
  tracks.forEach((t, trackIdx) => {
    const pattern = getTrackPattern(t);
    const n = t.steps;

    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const bx = Math.cos(angle) * t.radius;
      const by = Math.sin(angle) * t.radius;
      const isHit = pattern[i] === 1;

      // Outer ring bead node
      g.append("circle")
        .attr("id", `bead-${t.id}-${i}`)
        .attr("cx", bx)
        .attr("cy", by)
        .attr("r", isHit ? 7 : 3.5)
        .attr("fill", isHit ? t.color : "#1e293b")
        .attr("stroke", isHit ? "#fff" : "rgba(255,255,255,0.15)")
        .attr("stroke-width", isHit ? 1.5 : 1)
        .style("cursor", "pointer")
        .on("click", async () => {
          await initAudio();
          triggerHit(t, i);
        });
    }
  });

  // Center core hub
  g.append("circle")
    .attr("r", 14)
    .attr("fill", "#090d16")
    .attr("stroke", varColor(0))
    .attr("stroke-width", 2);

  g.append("circle")
    .attr("r", 6)
    .attr("fill", "#38bdf8");

  // Rotating Radar Needle Line
  g.append("line")
    .attr("id", "radar-needle")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", 0).attr("y2", -tracks[0].radius - 15)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .attr("stroke-linecap", "round")
    .style("opacity", 0.85);

  updateNeedleAngle(currentStep);
}

function varColor(i) {
  return tracks[i % tracks.length].color;
}

function updateNeedleAngle(step) {
  const angleDeg = (step / 16) * 360;
  const needle = d3.select("#radar-needle");
  if (!needle.empty()) {
    needle.attr("transform", `rotate(${angleDeg})`);
  }
}

// Trigger Drum/Synth Hit
function triggerHit(track, stepIdx) {
  if (!audioActive) return;

  const bead = d3.select(`#bead-${track.id}-${stepIdx}`);
  if (!bead.empty()) {
    bead.transition().duration(40).attr("r", 12).attr("stroke-width", 3)
      .transition().duration(180).attr("r", 7).attr("stroke-width", 1.5);
  }

  try {
    if (track.synth && melodySynth) {
      const note = pitchScale(stepIdx);
      melodySynth.triggerAttackRelease(note, "16n", undefined, 0.75);
    } else if (drums) {
      drums.trigger(track.sample, "16n", undefined, 0.85);
    }
  } catch (err) {
    console.error("Audio trigger hit error:", err);
  }
}

// Advance Step & Fire Rhythm Events
function tick() {
  updateNeedleAngle(currentStep);

  // Check each track for hits on this step
  tracks.forEach(t => {
    const pattern = getTrackPattern(t);
    const trackStep = Math.floor(currentStep * (t.steps / 16)) % t.steps;
    if (pattern[trackStep] === 1) {
      triggerHit(t, trackStep);
    }
  });

  currentStep = (currentStep + 1) % 16;
}

// Transport Play / Pause
function togglePlay() {
  if (isPlaying) {
    clearInterval(clockTimer);
    isPlaying = false;
    btnPlay.innerText = "▶ Start Engine";
    activeBadge.innerText = "Paused";
  } else {
    isPlaying = true;
    btnPlay.innerText = "⏸ Pause Engine";
    activeBadge.innerText = "Running 🔊";

    const bpm = +bpmSlider.value;
    const msPer16th = (60 / bpm / 4) * 1000;

    clearInterval(clockTimer);
    clockTimer = setInterval(tick, msPer16th);
  }
}

// Update Track UI Controls
function updateTrackUI() {
  tracks.forEach((t, i) => {
    const slider = document.getElementById(`t${i + 1}-slider`);
    const valSpan = document.getElementById(`t${i + 1}-val`);
    const patSpan = document.getElementById(`t${i + 1}-pattern`);

    if (slider) slider.value = t.pulses;
    if (valSpan) valSpan.innerText = `E(${t.pulses}, ${t.steps})`;
    if (patSpan) {
      const pattern = getTrackPattern(t);
      patSpan.innerText = pattern.map(h => (h ? 'x' : '.')).join('');
    }
  });
}

// Wire Up Sliders
tracks.forEach((t, i) => {
  const slider = document.getElementById(`t${i + 1}-slider`);
  if (slider) {
    slider.addEventListener("input", (e) => {
      t.pulses = +e.target.value;
      updateTrackUI();
      renderRadar();
    });
  }
});

// BPM Slider
bpmSlider.addEventListener("input", (e) => {
  bpmVal.innerText = `${e.target.value} BPM`;
  if (isPlaying) {
    togglePlay();
    togglePlay();
  }
});

// Play button
btnPlay.addEventListener("click", async () => {
  await initAudio();
  togglePlay();
});

if (btnAudioActivate) {
  btnAudioActivate.addEventListener("click", async () => {
    await initAudio();
  });
}

// Presets Definition
const presets = {
  bossa: { bpm: 130, k: [5, 3, 8, 5] },
  tresillo: { bpm: 108, k: [3, 2, 4, 3] },
  cinquillo: { bpm: 115, k: [5, 2, 8, 5] },
  samba: { bpm: 140, k: [7, 4, 12, 7] },
  techno: { bpm: 132, k: [4, 2, 8, 6] },
  aksak: { bpm: 145, k: [9, 5, 11, 9] },
  gnawa: { bpm: 112, k: [7, 3, 6, 5] },
  heavy: { bpm: 150, k: [11, 7, 14, 9] }
};

document.querySelectorAll(".preset-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const key = btn.getAttribute("data-preset");
    const p = presets[key];
    if (p) {
      bpmSlider.value = p.bpm;
      bpmVal.innerText = `${p.bpm} BPM`;
      tracks[0].pulses = p.k[0];
      tracks[1].pulses = p.k[1];
      tracks[2].pulses = p.k[2];
      tracks[3].pulses = p.k[3];

      updateTrackUI();
      renderRadar();

      if (isPlaying) {
        clearInterval(clockTimer);
        const msPer16th = (60 / p.bpm / 4) * 1000;
        clockTimer = setInterval(tick, msPer16th);
      }
    }
  });
});

// Live Traffic Load Spike Simulation
btnTraffic.addEventListener("click", async () => {
  await initAudio();
  if (trafficSimulationActive) {
    clearInterval(trafficInterval);
    trafficSimulationActive = false;
    btnTraffic.innerText = "📈 Load Spike";
    btnTraffic.classList.remove("btn-active");
  } else {
    trafficSimulationActive = true;
    btnTraffic.innerText = "⏹ Stop Spike";
    btnTraffic.classList.add("btn-active");
    if (!isPlaying) togglePlay();

    let stepCounter = 0;
    trafficInterval = setInterval(() => {
      stepCounter++;
      // Sine wave traffic modulation from 10% to 95% load
      const loadFactor = (Math.sin(stepCounter * 0.15) + 1) / 2; // 0.0 to 1.0
      tracks[0].pulses = Math.round(2 + loadFactor * 10);
      tracks[1].pulses = Math.round(1 + loadFactor * 7);
      tracks[2].pulses = Math.round(4 + loadFactor * 12);
      tracks[3].pulses = Math.round(2 + loadFactor * 9);

      updateTrackUI();
      renderRadar();
    }, 450);
  }
});

// Initial Setup
window.addEventListener("resize", renderRadar);
updateTrackUI();
renderRadar();
