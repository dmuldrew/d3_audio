import {
  scalePitch,
  scaleGain,
  scalePan,
  audioLegend,
  choreography,
  defaultEngine,
  createSynth,
  createSamplePlayer
} from '/src/index.js';

// 1. Real Curated USGS Earthquake Dataset (Major Global Fault Zones)
let earthquakeData = [
  {
    id: 0,
    region: "Japan Trench (Tohoku)",
    plate: "Pacific under Okhotsk Plate",
    type: "Subduction Megathrust",
    mag: 9.1,
    depthKm: 29,
    year: 2011,
    color: "#f43f5e",
    fact: "The 2011 M9.1 Tohoku earthquake shifted the main island of Honshu 2.4 meters eastward and altered Earth's rotational axis by ~17 cm."
  },
  {
    id: 1,
    region: "Chile Trench (Valdivia)",
    plate: "Nazca under South American Plate",
    type: "Megathrust Subduction",
    mag: 9.5,
    depthKm: 33,
    year: 1960,
    color: "#ec4899",
    fact: "The 1960 Valdivia quake is the most powerful earthquake ever instrumentally recorded (M9.5), releasing energy equivalent to 1,000 atomic bombs."
  },
  {
    id: 2,
    region: "Cascadia Zone (Pacific NW)",
    plate: "Juan de Fuca under North America",
    type: "Locked Megathrust",
    mag: 9.0,
    depthKm: 25,
    year: 1700,
    color: "#38bdf8",
    fact: "Cascadia ruptures in massive ~M9.0 megathrust events every 400–600 years, generating tsunami waves that crossed the Pacific to Japan in 1700."
  },
  {
    id: 3,
    region: "Sunda Megathrust (Sumatra)",
    plate: "Indo-Australian under Burma Plate",
    type: "Subduction Megathrust",
    mag: 9.1,
    depthKm: 30,
    year: 2004,
    color: "#a855f7",
    fact: "The 2004 Sumatra quake caused the entire planet to vibrate by up to 1 cm and ruptured a 1,300 km section of the oceanic crust."
  },
  {
    id: 4,
    region: "San Andreas (California)",
    plate: "Pacific alongside North America",
    type: "Strike-Slip Transform Fault",
    mag: 7.9,
    depthKm: 10,
    year: 1906,
    color: "#f59e0b",
    fact: "A shallow transform fault where the Pacific plate slides northwest past North America at roughly the same speed human fingernails grow (~33 mm/yr)."
  },
  {
    id: 5,
    region: "Himalayan Thrust (Nepal)",
    plate: "Indian colliding into Eurasian Plate",
    type: "Continental Collision Thrust",
    mag: 7.8,
    depthKm: 15,
    year: 2015,
    color: "#10b981",
    fact: "The continuous collision of the Indian subcontinent into Asia raises the Himalayas by ~5 mm every year while generating major seismic ruptures."
  }
];

// D3 Audio Scalers
// Depth (10km to 35km) -> Musical Pitch (Shallow = high resonant chime, Deep = sub-bass)
const pitchScale = scalePitch()
  .domain([10, 35])
  .range(["G4", "C2"])
  .scale("pentatonic")
  .root("C");

// Magnitude (7.0 to 9.5) -> Sound amplitude & rumble impact
const gainScale = scaleGain()
  .domain([7.0, 9.5])
  .range([0.55, 1.0]);

// Longitude / Index -> Stereo Panning
const panScale = scalePan()
  .domain([0, 5])
  .range([-0.8, 0.8]);

// Interactive Audio Legend
const legend = audioLegend()
  .title("Seismic Sonification Audio Key")
  .pitch(pitchScale, "Focal Depth (10km Shallow ➔ 35km Mantle)")
  .gain(gainScale, "Earthquake Magnitude (7.0 ➔ 9.5 Mw)")
  .pan(panScale, "Stereo Fault Longitude (West ↔ East)");

d3.select("#legend-mount").call(legend);

// Audio Synthesizers
const synthMelody = createSynth({ type: "fmSynth", harmonicity: 2.5, volume: -1 });
const drums = createSamplePlayer();

// D3 Pie Chart Dimensions
const container = document.getElementById('pie-area');
const width = container.clientWidth || 550;
const height = container.clientHeight || 490;
const radius = Math.min(width, height) / 2 - 25;
const innerRadius = 80;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g')
  .attr('transform', `translate(${width / 2}, ${height / 2})`);

const pieLayout = d3.pie()
  .value(d => Math.pow(10, (d.mag - 6) * 0.8)) // Energy-proportional slice area
  .padAngle(0.04)
  .sort(null);

const arcGenerator = d3.arc()
  .innerRadius(innerRadius)
  .outerRadius(radius)
  .cornerRadius(6);

let piePaths, sliceLabels;

function renderPie(data) {
  g.selectAll('*').remove();

  const arcs = pieLayout(data);

  piePaths = g.selectAll('.pie-slice')
    .data(arcs)
    .enter()
    .append('path')
    .attr('class', 'pie-slice')
    .attr('d', arcGenerator)
    .attr('fill', d => d.data.color)
    .attr('opacity', 0.85);

  // Region label text on slices
  sliceLabels = g.selectAll('.slice-label')
    .data(arcs)
    .enter()
    .append('text')
    .attr('transform', d => {
      const [x, y] = arcGenerator.centroid(d);
      return `translate(${x}, ${y})`;
    })
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em')
    .attr('fill', '#ffffff')
    .attr('font-size', '11px')
    .attr('font-weight', '800')
    .attr('pointer-events', 'none')
    .text(d => `M${d.data.mag}`);

  // Add click handlers for player interaction
  piePaths.on('click', async function(event, d) {
    if (!isPlayerTurn) return;
    await defaultEngine.start();
    handlePlayerInput(d.data.id, this, d.data);
  });
}

renderPie(earthquakeData);

// 2. Sound & Visual Activation for a Slice
function activateSlice(sliceId, domElement, data, isComputer = false) {
  const note = pitchScale(data.depthKm);
  const vel = gainScale(data.mag);
  const pan = panScale(data.id % 6);

  // Play subterranean bass impact + resonant tectonic tone
  drums.trigger("kick", "8n", undefined, vel * 0.9, { pan });
  synthMelody.triggerAttackRelease(note, "4n", undefined, vel, { pan });

  // Update Educational Fact Card
  updateFactCard(data);

  // Rhythmic Choreography: Shockwave Ripple + Glow
  choreography()
    .movement("ripple")
    .intensity(data.mag / 5.5)
    .duration(0.45)(domElement);

  choreography()
    .movement("glow")
    .intensity(1.8)
    .duration(0.35)(domElement);

  // Active flash
  d3.select(domElement)
    .classed('active-flash', true);

  setTimeout(() => {
    d3.select(domElement).classed('active-flash', false);
  }, 350);
}

function updateFactCard(d) {
  document.getElementById('info-title').innerHTML = `🌋 ${d.region} (M${d.mag})`;
  document.getElementById('info-badges').innerHTML = `
    <span class="info-stat">Magnitude: M${d.mag}</span>
    <span class="info-stat">Depth: ${d.depthKm} km</span>
    <span class="info-stat">Plate: ${d.plate}</span>
    <span class="info-stat">Type: ${d.type}</span>
    <span class="info-stat">Year: ${d.year || 'Recent'}</span>
  `;
  document.getElementById('info-desc').innerText = d.fact;
  exploredSet.add(d.region);
  document.getElementById('unlocked-val').innerText = `${exploredSet.size}/${earthquakeData.length}`;
}

// 3. Simon Game Engine
let simonSequence = [];
let playerStep = 0;
let isPlayerTurn = false;
let currentRound = 1;
let currentScore = 0;
let highStreak = 0;
let isGameRunning = false;
const exploredSet = new Set();

async function startNewGame() {
  await defaultEngine.start();
  simonSequence = [];
  playerStep = 0;
  currentRound = 1;
  currentScore = 0;
  isGameRunning = true;
  document.getElementById('score-val').innerText = '0';
  document.getElementById('round-num').innerText = '1';
  document.getElementById('start-game-btn').innerText = "🔄 Restart Game";
  document.getElementById('game-status-badge').innerText = "Round 1 Active";
  document.getElementById('game-status-badge').style.background = "rgba(56, 189, 248, 0.2)";
  document.getElementById('game-status-badge').style.color = "#38bdf8";

  nextRound();
}

function nextRound() {
  isPlayerTurn = false;
  playerStep = 0;
  document.getElementById('turn-indicator').innerText = "Watch";
  document.getElementById('turn-indicator').style.color = "#fbbf24";
  document.getElementById('round-num').innerText = currentRound;

  // Add a random earthquake region ID to sequence
  const randomId = Math.floor(Math.random() * earthquakeData.length);
  simonSequence.push(randomId);

  // Play the sequence
  playSimonSequence();
}

async function playSimonSequence() {
  await new Promise(r => setTimeout(r, 600));

  for (let i = 0; i < simonSequence.length; i++) {
    const id = simonSequence[i];
    const data = earthquakeData.find(d => d.id === id);
    const node = piePaths.nodes()[id];

    activateSlice(id, node, data, true);

    const speed = Math.max(300, 750 - (currentRound * 35));
    await new Promise(r => setTimeout(r, speed));
  }

  // Turn over to player
  isPlayerTurn = true;
  document.getElementById('turn-indicator').innerText = "Your Turn!";
  document.getElementById('turn-indicator').style.color = "#10b981";
}

function handlePlayerInput(clickedId, domElement, data) {
  activateSlice(clickedId, domElement, data, false);

  if (clickedId === simonSequence[playerStep]) {
    // Correct step
    playerStep++;
    currentScore += 10 * currentRound;
    document.getElementById('score-val').innerText = currentScore;

    if (playerStep > highStreak) {
      highStreak = playerStep;
      document.getElementById('streak-val').innerText = highStreak;
    }

    if (playerStep === simonSequence.length) {
      // Completed the full round!
      isPlayerTurn = false;
      currentRound++;
      document.getElementById('turn-indicator').innerText = "✓ Nice!";
      document.getElementById('turn-indicator').style.color = "#10b981";

      setTimeout(() => {
        nextRound();
      }, 900);
    }
  } else {
    // Mistake / Fault Break
    isPlayerTurn = false;
    isGameRunning = false;
    document.getElementById('turn-indicator').innerText = "Break!";
    document.getElementById('turn-indicator').style.color = "#f43f5e";
    document.getElementById('game-status-badge').innerText = "Seismic Fault Break!";
    document.getElementById('game-status-badge').style.background = "rgba(244, 63, 94, 0.2)";
    document.getElementById('game-status-badge').style.color = "#f43f5e";

    // Play error sound and shake entire pie
    drums.trigger("snare", "8n", undefined, 1.0);
    g.selectAll('.pie-slice').each(function() {
      choreography().movement("shake").intensity(2.0).duration(0.5)(this);
    });

    document.getElementById('info-title').innerHTML = `⚠️ Seismic Fault Rupture!`;
    document.getElementById('info-desc').innerText = `You reached Round ${currentRound} with a final score of ${currentScore}! Press Restart to play again and test your seismic memory.`;
  }
}

document.getElementById('start-game-btn').addEventListener('click', () => {
  startNewGame();
});

// 4. Fetch Live USGS Real-Time Earthquakes (M4.5+ in past 24 hours)
const liveBtn = document.getElementById('fetch-live-btn');
liveBtn.addEventListener('click', async () => {
  liveBtn.innerText = "⏳ Querying USGS API...";
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson');
    const json = await res.json();
    if (json.features && json.features.length >= 4) {
      const liveSlice = json.features.slice(0, 6).map((f, i) => ({
        id: i,
        region: f.properties.place || "Pacific Basin",
        plate: `Coord: [${f.geometry.coordinates[0].toFixed(1)}, ${f.geometry.coordinates[1].toFixed(1)}]`,
        type: "Real-Time USGS Event",
        mag: Math.max(4.5, +(f.properties.mag || 5.0).toFixed(1)),
        depthKm: Math.max(5, Math.round(f.geometry.coordinates[2])),
        year: 2026,
        color: ["#f43f5e", "#ec4899", "#38bdf8", "#a855f7", "#f59e0b", "#10b981"][i % 6],
        fact: `Live event recorded by USGS global seismograph network at ${new Date(f.properties.time).toLocaleTimeString()} with magnitude M${f.properties.mag}.`
      }));

      earthquakeData = liveSlice;
      renderPie(earthquakeData);
      liveBtn.innerText = "✓ Loaded Live USGS Quakes";
      document.getElementById('info-title').innerText = "📡 Real-Time USGS Earthquakes Loaded";
      document.getElementById('info-desc').innerText = `Loaded ${liveSlice.length} real earthquakes occurring in the past 24 hours. Click 'Start Game' to play with live planet data!`;
    } else {
      liveBtn.innerText = "✓ Using Major Global Quakes";
    }
  } catch (err) {
    console.warn("USGS live fetch fallback:", err);
    liveBtn.innerText = "✓ Curated Quakes Active";
  }
});
