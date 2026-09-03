// 20. Advanced Scalers & Multivariate Sound Lab
// Demonstrating scaleUncertainty(), scaleSpatial(), scaleEcho(), and scaleChord()
import {
  scaleUncertainty,
  scaleSpatial,
  scaleEcho,
  scaleChord,
  defaultEngine,
  createSynth
} from '../../src/index.js';

const dataset = [
  { step: 0, label: "Zurich Hub", uncertainty: 0.02, distance: 45, latency: 18, gdp: 92, health: 95, edu: 90, note: "C4" },
  { step: 1, label: "Geneva Core", uncertainty: 0.05, distance: 80, latency: 24, gdp: 88, health: 91, edu: 89, note: "D4" },
  { step: 2, label: "Paris Relay", uncertainty: 0.12, distance: 160, latency: 45, gdp: 82, health: 85, edu: 84, note: "E4" },
  { step: 3, label: "London Array", uncertainty: 0.18, distance: 240, latency: 65, gdp: 80, health: 82, edu: 86, note: "G4" },
  { step: 4, label: "Stockholm Node", uncertainty: 0.25, distance: 350, latency: 90, gdp: 85, health: 88, edu: 92, note: "A4" },
  { step: 5, label: "Reykjavik Site", uncertainty: 0.35, distance: 480, latency: 140, gdp: 74, health: 79, edu: 81, note: "B4" },
  { step: 6, label: "Azores Sensor", uncertainty: 0.48, distance: 620, latency: 210, gdp: 65, health: 70, edu: 68, note: "C5" },
  { step: 7, label: "Bermuda Float", uncertainty: 0.62, distance: 750, latency: 310, gdp: 58, health: 62, edu: 60, note: "D5" },
  { step: 8, label: "Halifax Station", uncertainty: 0.75, distance: 820, latency: 420, gdp: 52, health: 58, edu: 55, note: "E5" },
  { step: 9, label: "Nuuk Satellite", uncertainty: 0.88, distance: 910, latency: 540, gdp: 45, health: 48, edu: 50, note: "G5" },
  { step: 10, label: "Svalbard Outpost", uncertainty: 0.95, distance: 980, latency: 650, gdp: 38, health: 40, edu: 42, note: "A5" },
  { step: 11, label: "Thule Beacon", uncertainty: 0.82, distance: 860, latency: 480, gdp: 44, health: 46, edu: 48, note: "G5" },
  { step: 12, label: "Fairbanks Base", uncertainty: 0.68, distance: 710, latency: 350, gdp: 55, health: 59, edu: 62, note: "E5" },
  { step: 13, label: "Anchorage Post", uncertainty: 0.42, distance: 540, latency: 180, gdp: 68, health: 72, edu: 70, note: "C5" },
  { step: 14, label: "Seattle Harbor", uncertainty: 0.22, distance: 310, latency: 75, gdp: 79, health: 81, edu: 85, note: "A4" },
  { step: 15, label: "Vancouver Core", uncertainty: 0.08, distance: 120, latency: 30, gdp: 86, health: 89, edu: 88, note: "G4" }
];

// Audio Scalers
const uncScale = scaleUncertainty().domain([0, 1]).range([16, 2]);
const spatScale = scaleSpatial().domain([0, 1000]).range([0.05, 0.92]).decay([0.4, 6.5]);
const echoScale = scaleEcho().domain([0, 700]).range([0.06, 0.55]).feedback([0.1, 0.65]);
const chordScale = scaleChord();

// State
let currentTab = "unified";
let currentIndex = 0;
let isPlaying = false;
let playInterval = null;
let synthVoice = null;
let polyVoice = null;
let audioStarted = false;

// DOM Elements
const svg = d3.select("#main-svg");
const chartBox = document.getElementById("chart-container");
const scrubSlider = document.getElementById("scrub-slider");
const scrubVal = document.getElementById("scrub-val");
const speedSlider = document.getElementById("speed-slider");
const speedVal = document.getElementById("speed-val");
const btnPlay = document.getElementById("btn-play-toggle");
const btnAudition = document.getElementById("btn-audition-hover");
const telemetryBox = document.getElementById("telemetry-readout");
const activeBadge = document.getElementById("active-badge");
const viewTitle = document.getElementById("view-title");
const btnAudioActivate = document.getElementById("btn-audio-activate");

// Initialize Tone Instruments
async function initAudio() {
  try {
    await defaultEngine.start();
    audioStarted = true;
    if (btnAudioActivate) {
      btnAudioActivate.innerText = "✓ Audio Active 🔊";
      btnAudioActivate.style.background = "#10b981";
      btnAudioActivate.style.color = "#030712";
    }

    if (!synthVoice) {
      synthVoice = createSynth({
        type: "fmSynth",
        volume: -3,
        crusher: { bits: 16, wet: 0.1 },
        reverb: { wet: 0.05, decay: 0.4 },
        delay: { wet: 0.1, delayTime: 0.08, feedback: 0.1 }
      });
    }
    if (!polyVoice) {
      polyVoice = createSynth({
        type: "polySynth",
        volume: -5
      });
    }
  } catch (err) {
    console.warn("Audio init warning:", err);
  }
}

// Map record to chord parameters
function getChordForRecord(d) {
  const avg = (d.gdp + d.health + d.edu) / 3;
  let quality = "maj7";
  let root = "C3";

  if (avg > 80) {
    quality = "maj7";
    root = "C3";
  } else if (avg > 65) {
    quality = "add9";
    root = "D3";
  } else if (avg > 50) {
    quality = "min7";
    root = "A2";
  } else {
    quality = "dim7";
    root = "B2";
  }
  return chordScale({ root, quality, voicing: "open" });
}

// Update telemetry display without producing sound
function updateTelemetry(item) {
  const unc = uncScale(item.uncertainty);
  const spat = spatScale(item.distance);
  const echo = echoScale(item.latency);
  const chord = getChordForRecord(item);

  telemetryBox.innerHTML = `
    <strong>📍 ${item.label} (Step ${item.step + 1} of ${dataset.length})</strong><br>
    • <strong>Confidence / BitCrush:</strong> ${unc.bits} bits (${unc.label}) | Grit: ${(unc.grit * 100).toFixed(0)}%<br>
    • <strong>Spatial 3D Reverb:</strong> ${(spat.wet * 100).toFixed(0)}% Wet | Decay: ${spat.decay.toFixed(1)}s (${item.distance}km)<br>
    • <strong>Echo Feedback Delay:</strong> Delay: ${echo.delayTime.toFixed(2)}s | Feedback: ${(echo.feedback * 100).toFixed(0)}% (${item.latency}ms)<br>
    • <strong>Multivariate Chord:</strong> ${chord.root} ${chord.quality.toUpperCase()} [${chord.notes.join('-')}]
  `;
}

// Trigger sound for data item
async function sonifyPoint(item) {
  updateTelemetry(item);
  await initAudio();

  const unc = uncScale(item.uncertainty);
  const spat = spatScale(item.distance);
  const echo = echoScale(item.latency);
  const chord = getChordForRecord(item);

  try {
    if (currentTab === "chord") {
      // Voiced PolySynth chord
      if (polyVoice) polyVoice.triggerAttackRelease(chord.notes, "2n", undefined, 0.75);
    } else if (currentTab === "uncertainty") {
      // Focus on BitCrusher reduction
      if (synthVoice) synthVoice.triggerAttackRelease(item.note, "4n", undefined, 0.85, {
        crusher: unc,
        reverb: { wet: 0.02 },
        delay: { wet: 0 }
      });
    } else if (currentTab === "spatial") {
      // Focus on Freeverb decay & wet mix
      if (synthVoice) synthVoice.triggerAttackRelease(item.note, "4n", undefined, 0.85, {
        crusher: { bits: 16, wet: 0 },
        reverb: spat,
        delay: { wet: 0 }
      });
    } else if (currentTab === "echo") {
      // Focus on Feedback Delay taps
      if (synthVoice) synthVoice.triggerAttackRelease(item.note, "8n", undefined, 0.85, {
        crusher: { bits: 16, wet: 0 },
        reverb: { wet: 0.05 },
        delay: echo
      });
    } else {
      // Unified Symphony: chord + effects simultaneous!
      if (polyVoice) polyVoice.triggerAttackRelease(chord.notes, "4n", undefined, 0.65);
      if (synthVoice) synthVoice.triggerAttackRelease(item.note, "8n", undefined, 0.75, {
        crusher: unc,
        reverb: spat,
        delay: echo
      });
    }
  } catch (err) {
    console.error("Audio trigger error:", err);
  }
}

// -------------------------------------------------------------
// VISUALIZATION RENDERERS
// -------------------------------------------------------------
function render() {
  svg.selectAll("*").remove();
  const rect = chartBox.getBoundingClientRect();
  const w = Math.max(320, rect.width || 720);
  const h = Math.max(240, rect.height || 480);
  const m = { top: 35, right: 35, bottom: 45, left: 55 };
  const innerW = w - m.left - m.right;
  const innerH = h - m.top - m.bottom;

  const g = svg.append("g").attr("transform", `translate(${m.left}, ${m.top})`);

  if (currentTab === "uncertainty") {
    renderUncertaintyView(g, innerW, innerH);
  } else if (currentTab === "spatial") {
    renderSpatialView(g, innerW, innerH);
  } else if (currentTab === "echo") {
    renderEchoView(g, innerW, innerH);
  } else if (currentTab === "chord") {
    renderChordView(g, innerW, innerH);
  } else {
    renderUnifiedView(g, innerW, innerH);
  }
}

// TAB 1: Unified Multi-Scaler Symphony
function renderUnifiedView(g, w, h) {
  const x = d3.scaleLinear().domain([0, dataset.length - 1]).range([0, w]);
  const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

  const lineGdp = d3.line().x((d, i) => x(i)).y(d => y(d.gdp)).curve(d3.curveMonotoneX);
  const lineDist = d3.line().x((d, i) => x(i)).y(d => y(d.distance / 10)).curve(d3.curveMonotoneX);
  const lineLat = d3.line().x((d, i) => x(i)).y(d => y(d.latency / 7)).curve(d3.curveMonotoneX);
  const lineUnc = d3.line().x((d, i) => x(i)).y(d => y(d.uncertainty * 100)).curve(d3.curveMonotoneX);

  // Background grid
  g.append("g").attr("transform", `translate(0, ${h})`).call(d3.axisBottom(x).ticks(16).tickFormat(i => dataset[i] ? dataset[i].label.split(' ')[0] : i)).attr("color", "#475569");
  g.append("g").call(d3.axisLeft(y).ticks(5)).attr("color", "#475569");

  // Metric Lines
  g.append("path").datum(dataset).attr("fill", "none").attr("stroke", "#38bdf8").attr("stroke-width", 2.5).attr("d", lineGdp);
  g.append("path").datum(dataset).attr("fill", "none").attr("stroke", "#c084fc").attr("stroke-width", 2).attr("stroke-dasharray", "4 4").attr("d", lineDist);
  g.append("path").datum(dataset).attr("fill", "none").attr("stroke", "#fbbf24").attr("stroke-width", 2).attr("stroke-dasharray", "2 2").attr("d", lineLat);
  g.append("path").datum(dataset).attr("fill", "none").attr("stroke", "#f43f5e").attr("stroke-width", 2).attr("d", lineUnc);

  // Legend markers
  const legendG = g.append("g").attr("transform", "translate(10, 5)");
  const tracks = [
    { label: "GDP / Chord (scaleChord)", color: "#38bdf8" },
    { label: "Distance / Reverb (scaleSpatial)", color: "#c084fc" },
    { label: "Latency / Delay (scaleEcho)", color: "#fbbf24" },
    { label: "Uncertainty / Crush (scaleUncertainty)", color: "#f43f5e" }
  ];
  tracks.forEach((t, i) => {
    legendG.append("rect").attr("x", i * 150).attr("y", 0).attr("width", 10).attr("height", 10).attr("fill", t.color);
    legendG.append("text").attr("x", i * 150 + 15).attr("y", 9).attr("fill", "#94a3b8").attr("font-size", "10px").text(t.label);
  });

  // Playhead Vertical Line
  g.append("line")
    .attr("id", "sym-playhead")
    .attr("y1", 0).attr("y2", h)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .attr("x1", x(currentIndex)).attr("x2", x(currentIndex));

  // Interactive Click Surface
  svg.on("click", (e) => {
    const coords = d3.pointer(e, g.node());
    const idx = Math.round(x.invert(coords[0]));
    if (idx >= 0 && idx < dataset.length) {
      setIndex(idx);
      sonifyPoint(dataset[idx]);
    }
  });
}

// TAB 2: Confidence Interval & BitCrush (scaleUncertainty)
function renderUncertaintyView(g, w, h) {
  const x = d3.scaleLinear().domain([0, dataset.length - 1]).range([0, w]);
  const y = d3.scaleLinear().domain([20, 100]).range([h, 0]);

  // Shaded Confidence Band (Width expands with uncertainty!)
  const area = d3.area()
    .x((d, i) => x(i))
    .y0(d => y(Math.max(20, d.gdp - (d.uncertainty * 28))))
    .y1(d => y(Math.min(100, d.gdp + (d.uncertainty * 28))))
    .curve(d3.curveMonotoneX);

  const line = d3.line().x((d, i) => x(i)).y(d => y(d.gdp)).curve(d3.curveMonotoneX);

  g.append("path").datum(dataset).attr("fill", "rgba(244, 63, 94, 0.25)").attr("d", area);
  g.append("path").datum(dataset).attr("fill", "none").attr("stroke", "#f43f5e").attr("stroke-width", 2.5).attr("d", line);

  // Nodes with bit depth labels
  dataset.forEach((d, i) => {
    const unc = uncScale(d.uncertainty);
    const color = unc.bits >= 12 ? "#38bdf8" : (unc.bits >= 8 ? "#fbbf24" : "#f43f5e");

    g.append("circle")
      .attr("cx", x(i)).attr("cy", y(d.gdp)).attr("r", 6)
      .attr("fill", color).attr("stroke", "#fff").attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("click", () => {
        setIndex(i);
        sonifyPoint(d);
      });

    g.append("text")
      .attr("x", x(i)).attr("y", y(d.gdp) - 10)
      .attr("text-anchor", "middle").attr("fill", color)
      .attr("font-size", "10px").attr("font-family", "monospace")
      .text(`${unc.bits}b`);
  });

  g.append("g").attr("transform", `translate(0, ${h})`).call(d3.axisBottom(x).ticks(16).tickFormat(i => dataset[i] ? dataset[i].label.split(' ')[0] : i)).attr("color", "#475569");
  g.append("g").call(d3.axisLeft(y)).attr("color", "#475569");

  // Playhead line
  g.append("line")
    .attr("id", "sym-playhead")
    .attr("y1", 0).attr("y2", h)
    .attr("stroke", "#fff").attr("stroke-width", 2)
    .attr("x1", x(currentIndex)).attr("x2", x(currentIndex));

  svg.on("click", (e) => {
    const coords = d3.pointer(e, g.node());
    const idx = Math.round(x.invert(coords[0]));
    if (idx >= 0 && idx < dataset.length) {
      setIndex(idx);
      sonifyPoint(dataset[idx]);
    }
  });
}

// TAB 3: 3D Depth & Spatial Reverb (scaleSpatial)
function renderSpatialView(g, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) / 2 - 20;

  // Concentric Distance Zones
  const zones = [
    { r: maxR * 0.25, label: "Near / Dry (0.4s)", wet: "5% Wet" },
    { r: maxR * 0.50, label: "Mid / Room (1.8s)", wet: "30% Wet" },
    { r: maxR * 0.75, label: "Hall / Ambient (3.5s)", wet: "60% Wet" },
    { r: maxR * 1.00, label: "Cavern / Distant (6.5s)", wet: "90% Wet" }
  ];

  zones.forEach(z => {
    g.append("circle")
      .attr("cx", cx).attr("cy", cy).attr("r", z.r)
      .attr("fill", "none").attr("stroke", "rgba(192, 132, 252, 0.2)").attr("stroke-dasharray", "3 3");

    g.append("text")
      .attr("x", cx + 5).attr("y", cy - z.r + 12)
      .attr("fill", "#c084fc").attr("font-size", "9px").attr("font-family", "monospace")
      .text(z.label);
  });

  // Observer Center
  g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 7).attr("fill", "#38bdf8");
  g.append("text").attr("x", cx).attr("y", cy + 18).attr("text-anchor", "middle").attr("fill", "#fff").attr("font-size", "10px").text("🎧 Listener");

  // Scatter Nodes by distance and angular position
  dataset.forEach((d, i) => {
    const angle = (i / dataset.length) * Math.PI * 2 - Math.PI / 2;
    const r = (d.distance / 1000) * maxR;
    const nx = cx + Math.cos(angle) * r;
    const ny = cy + Math.sin(angle) * r;

    const isCur = i === currentIndex;
    g.append("circle")
      .attr("cx", nx).attr("cy", ny).attr("r", isCur ? 8 : 5)
      .attr("fill", isCur ? "#f43f5e" : "#c084fc")
      .attr("stroke", "#fff").attr("stroke-width", isCur ? 2 : 1)
      .style("cursor", "pointer")
      .on("click", (e) => {
        e.stopPropagation();
        setIndex(i);
        sonifyPoint(d);
        render();
      });

    g.append("text")
      .attr("x", nx + 8).attr("y", ny + 3)
      .attr("fill", "#94a3b8").attr("font-size", "9px")
      .text(`${d.label.split(' ')[0]} (${d.distance}km)`);
  });
}

// TAB 4: Network Latency & Feedback Echo (scaleEcho)
function renderEchoView(g, w, h) {
  const x = d3.scaleBand().domain(dataset.map((d, i) => i)).range([0, w]).padding(0.25);
  const y = d3.scaleLinear().domain([0, 700]).range([h, 0]);

  // Bars for Latency
  g.selectAll(".lat-bar")
    .data(dataset)
    .enter()
    .append("rect")
    .attr("x", (d, i) => x(i))
    .attr("y", d => y(d.latency))
    .attr("width", x.bandwidth())
    .attr("height", d => h - y(d.latency))
    .attr("fill", (d, i) => i === currentIndex ? "#f43f5e" : "#fbbf24")
    .attr("rx", 3)
    .style("cursor", "pointer")
    .on("click", (e, d) => {
      e.stopPropagation();
      setIndex(d.step);
      sonifyPoint(d);
      render();
    });

  // Echo delay tap indicator labels
  dataset.forEach((d, i) => {
    g.append("text")
      .attr("x", x(i) + x.bandwidth() / 2)
      .attr("y", y(d.latency) - 8)
      .attr("text-anchor", "middle")
      .attr("fill", "#fbbf24")
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .text(`${d.latency}ms`);
  });

  g.append("g").attr("transform", `translate(0, ${h})`).call(d3.axisBottom(x).tickFormat(i => dataset[i].label.split(' ')[0])).attr("color", "#475569");
  g.append("g").call(d3.axisLeft(y)).attr("color", "#475569");
}

// TAB 5: Multivariate Chord Harmonies (scaleChord)
function renderChordView(g, w, h) {
  const x = d3.scaleBand().domain(dataset.map((d, i) => i)).range([0, w]).padding(0.3);
  const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);
  const subX = d3.scaleBand().domain(["gdp", "health", "edu"]).range([0, x.bandwidth()]).padding(0.1);

  dataset.forEach((d, i) => {
    const chord = getChordForRecord(d);
    const isCur = i === currentIndex;

    ["gdp", "health", "edu"].forEach(k => {
      const col = k === "gdp" ? "#38bdf8" : (k === "health" ? "#10b981" : "#c084fc");
      g.append("rect")
        .attr("x", x(i) + subX(k))
        .attr("y", y(d[k]))
        .attr("width", subX.bandwidth())
        .attr("height", h - y(d[k]))
        .attr("fill", isCur ? "#f43f5e" : col)
        .attr("opacity", isCur ? 1.0 : 0.85)
        .attr("rx", 2);
    });

    // Chord quality label above group
    g.append("text")
      .attr("x", x(i) + x.bandwidth() / 2)
      .attr("y", y(Math.max(d.gdp, d.health, d.edu)) - 8)
      .attr("text-anchor", "middle")
      .attr("fill", isCur ? "#f43f5e" : "#fff")
      .attr("font-size", "10px")
      .attr("font-weight", "700")
      .attr("font-family", "monospace")
      .text(chord.quality.toUpperCase());
  });

  g.append("g").attr("transform", `translate(0, ${h})`).call(d3.axisBottom(x).tickFormat(i => dataset[i].label.split(' ')[0])).attr("color", "#475569");
  g.append("g").call(d3.axisLeft(y)).attr("color", "#475569");

  // Click handler
  svg.on("click", (e) => {
    const coords = d3.pointer(e, g.node());
    const stepW = w / dataset.length;
    const idx = Math.floor(coords[0] / stepW);
    if (idx >= 0 && idx < dataset.length) {
      setIndex(idx);
      sonifyPoint(dataset[idx]);
      render();
    }
  });
}

// -------------------------------------------------------------
// NAVIGATION & INTERACTIVE CONTROLS
// -------------------------------------------------------------
function setIndex(idx) {
  currentIndex = Math.max(0, Math.min(dataset.length - 1, idx));
  scrubSlider.value = currentIndex;
  scrubVal.innerText = currentIndex;

  const playhead = d3.select("#sym-playhead");
  if (!playhead.empty()) {
    const rect = chartBox.getBoundingClientRect();
    const w = Math.max(320, (rect.width || 720) - 90);
    const x = d3.scaleLinear().domain([0, dataset.length - 1]).range([0, w]);
    playhead.attr("x1", x(currentIndex)).attr("x2", x(currentIndex));
  }
}

// Tab switcher
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.getAttribute("data-tab");

    const titles = {
      unified: "🌐 Unified Multi-Scaler Symphony",
      uncertainty: "🔬 Confidence Interval & Bit-Crusher Lab (scaleUncertainty)",
      spatial: "🌌 3D Spatial Depth & Freeverb Reverb Lab (scaleSpatial)",
      echo: "📡 Network Latency & Feedback Delay Echo Lab (scaleEcho)",
      chord: "🎹 Multivariate Harmonic Triads Lab (scaleChord)"
    };
    viewTitle.innerText = titles[currentTab] || "Advanced Scalers";
    render();
    updateTelemetry(dataset[currentIndex]);
    if (audioStarted) {
      sonifyPoint(dataset[currentIndex]);
    }
  });
});

// Scrub Slider
scrubSlider.addEventListener("input", (e) => {
  setIndex(+e.target.value);
  updateTelemetry(dataset[currentIndex]);
  if (audioStarted) {
    sonifyPoint(dataset[currentIndex]);
  }
});

// Speed Slider
speedSlider.addEventListener("input", (e) => {
  speedVal.innerText = `${e.target.value} BPM`;
  if (isPlaying) {
    togglePlay();
    togglePlay();
  }
});

// Play / Pause Toggle
function togglePlay() {
  if (isPlaying) {
    clearInterval(playInterval);
    isPlaying = false;
    btnPlay.innerText = "▶ Play Interactive Sequence";
    activeBadge.innerText = "Paused";
  } else {
    isPlaying = true;
    btnPlay.innerText = "⏸ Pause Sequence";
    activeBadge.innerText = "Playing 🔊";

    const bpm = +speedSlider.value;
    const msPerBeat = (60 / bpm) * 1000 * 0.75;

    playInterval = setInterval(() => {
      sonifyPoint(dataset[currentIndex]);
      currentIndex = (currentIndex + 1) % dataset.length;
      setIndex(currentIndex);
      if (currentTab === "spatial" || currentTab === "chord" || currentTab === "echo") {
        render();
      }
    }, msPerBeat);
  }
}

btnPlay.addEventListener("click", async () => {
  await initAudio();
  togglePlay();
});

btnAudition.addEventListener("click", async () => {
  await initAudio();
  sonifyPoint(dataset[currentIndex]);
});

if (btnAudioActivate) {
  btnAudioActivate.addEventListener("click", async () => {
    await initAudio();
    sonifyPoint(dataset[currentIndex]);
  });
}

// -------------------------------------------------------------
// AUDIO LEGEND KEY GENERATION
// -------------------------------------------------------------
function setupAudioLegend() {
  const legendBox = document.getElementById("audio-legend-box");
  legendBox.innerHTML = `
    <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.6rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span><strong>Confidence:</strong> 16-bit pure ➔ 2-bit lo-fi</span>
        <button id="btn-legend-unc" style="background:#1e293b; color:#38bdf8; border:1px solid rgba(255,255,255,0.1); padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem; cursor:pointer;">🔊 Test</button>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span><strong>Spatial Depth:</strong> Dry ➔ 6.5s Cavern Reverb</span>
        <button id="btn-legend-spat" style="background:#1e293b; color:#c084fc; border:1px solid rgba(255,255,255,0.1); padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem; cursor:pointer;">🔊 Test</button>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span><strong>Latency:</strong> Instant ➔ Cascading Echo</span>
        <button id="btn-legend-echo" style="background:#1e293b; color:#fbbf24; border:1px solid rgba(255,255,255,0.1); padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem; cursor:pointer;">🔊 Test</button>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span><strong>Harmonic Chords:</strong> Major7 ➔ Diminished</span>
        <button id="btn-legend-chord" style="background:#1e293b; color:#10b981; border:1px solid rgba(255,255,255,0.1); padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem; cursor:pointer;">🔊 Test</button>
      </div>
    </div>
  `;

  document.getElementById("btn-legend-unc").addEventListener("click", async () => {
    await initAudio();
    if (synthVoice) synthVoice.triggerAttackRelease("C4", "8n", undefined, 0.8, { crusher: { bits: 3, wet: 0.95 } });
  });
  document.getElementById("btn-legend-spat").addEventListener("click", async () => {
    await initAudio();
    if (synthVoice) synthVoice.triggerAttackRelease("E4", "8n", undefined, 0.8, { reverb: { wet: 0.9, decay: 6.0 } });
  });
  document.getElementById("btn-legend-echo").addEventListener("click", async () => {
    await initAudio();
    if (synthVoice) synthVoice.triggerAttackRelease("G4", "16n", undefined, 0.8, { delay: { delayTime: 0.25, feedback: 0.65, wet: 0.6 } });
  });
  document.getElementById("btn-legend-chord").addEventListener("click", async () => {
    await initAudio();
    const ch = chordScale({ root: "C3", quality: "maj7" });
    if (polyVoice) polyVoice.triggerAttackRelease(ch.notes, "2n", undefined, 0.75);
  });
}

// Initial setup
window.addEventListener("resize", render);
setupAudioLegend();
render();
setIndex(0);
updateTelemetry(dataset[0]);
