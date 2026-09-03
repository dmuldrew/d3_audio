import {
  scalePitch,
  scaleGain,
  scalePan,
  choreography,
  defaultEngine,
  createSynth
} from '/src/index.js';

// NASA Exoplanet Systems Database
const exoplanetSystems = {
  trappist1: {
    name: "TRAPPIST-1 System (Ultra-Cool Dwarf)",
    starColor: "#ef4444",
    starRadius: 18,
    planets: [
      { name: "TRAPPIST-1b", periodDays: 1.51, radiusEarth: 1.12, semiMajorAU: 0.011, color: "#f87171", fact: "Closest to star; tidal forces create intense interior heating and high orbital speed." },
      { name: "TRAPPIST-1c", periodDays: 2.42, radiusEarth: 1.10, semiMajorAU: 0.015, color: "#fb923c", fact: "Dense rocky world with thick atmosphere, 8:5 orbital resonance with planet b." },
      { name: "TRAPPIST-1d", periodDays: 4.05, radiusEarth: 0.78, semiMajorAU: 0.021, color: "#fbbf24", fact: "Smallest in the system; receives comparable radiation to Earth." },
      { name: "TRAPPIST-1e", periodDays: 6.10, radiusEarth: 0.92, semiMajorAU: 0.028, color: "#34d399", fact: "Prime candidate for liquid surface water with an Earth-like iron core density." },
      { name: "TRAPPIST-1f", periodDays: 9.21, radiusEarth: 1.04, semiMajorAU: 0.037, color: "#38bdf8", fact: "Water-rich planet with a potential global ocean under ice cover." },
      { name: "TRAPPIST-1g", periodDays: 12.35, radiusEarth: 1.13, semiMajorAU: 0.045, color: "#818cf8", fact: "Largest planet in the system; located in the outer habitable zone." },
      { name: "TRAPPIST-1h", periodDays: 18.77, radiusEarth: 0.76, semiMajorAU: 0.060, color: "#c084fc", fact: "Frigid icy world marking the outermost resonant chain boundary." }
    ]
  },
  kepler90: {
    name: "Kepler-90 System (8-Planet Solar Twin)",
    starColor: "#fbbf24",
    starRadius: 22,
    planets: [
      { name: "Kepler-90b", periodDays: 7.0, radiusEarth: 1.31, semiMajorAU: 0.074, color: "#f87171", fact: "Scorching super-Earth with surface temperatures exceeding 800°F." },
      { name: "Kepler-90c", periodDays: 8.7, radiusEarth: 1.18, semiMajorAU: 0.089, color: "#fb923c", fact: "Rocky inner planet closely packed near the host G-type star." },
      { name: "Kepler-90i", periodDays: 14.4, radiusEarth: 1.32, semiMajorAU: 0.123, color: "#fbbf24", fact: "Discovered using Google AI neural networks analyzing Kepler transit dips!" },
      { name: "Kepler-90d", periodDays: 59.7, radiusEarth: 2.88, semiMajorAU: 0.32, color: "#34d399", fact: "Warm Sub-Neptune with a voluminous volatile atmosphere." },
      { name: "Kepler-90e", periodDays: 91.9, radiusEarth: 2.67, semiMajorAU: 0.42, color: "#38bdf8", fact: "Sub-Neptune orbiting just inside Earth's equivalent orbit." },
      { name: "Kepler-90f", periodDays: 124.9, radiusEarth: 2.89, semiMajorAU: 0.48, color: "#818cf8", fact: "Gaseous planet with orbital eccentricities stabilized by outer giants." },
      { name: "Kepler-90g", periodDays: 210.6, radiusEarth: 8.13, semiMajorAU: 0.71, color: "#c084fc", fact: "Gas giant comparable to Saturn orbiting within 1 AU." },
      { name: "Kepler-90h", periodDays: 331.6, radiusEarth: 11.32, semiMajorAU: 1.01, color: "#f472b6", fact: "Jupiter-sized giant world completing an Earth-length 331-day year." }
    ]
  },
  solarsystem: {
    name: "Solar System (Our Home Planets)",
    starColor: "#fbbf24",
    starRadius: 24,
    planets: [
      { name: "Mercury", periodDays: 88, radiusEarth: 0.38, semiMajorAU: 0.39, color: "#94a3b8", fact: "Fastest orbital speed in solar system (47 km/s)." },
      { name: "Venus", periodDays: 225, radiusEarth: 0.95, semiMajorAU: 0.72, color: "#f59e0b", fact: "Hottest planet in solar system with runaway greenhouse effect." },
      { name: "Earth", periodDays: 365, radiusEarth: 1.00, semiMajorAU: 1.00, color: "#38bdf8", fact: "Only known planet harboring liquid surface oceans and life." },
      { name: "Mars", periodDays: 687, radiusEarth: 0.53, semiMajorAU: 1.52, color: "#ef4444", fact: "Red planet home to Olympus Mons, the tallest volcano in the solar system." },
      { name: "Jupiter", periodDays: 4333, radiusEarth: 11.2, semiMajorAU: 5.20, color: "#d97706", fact: "Massive gas giant with 95 moons and iconic Great Red Spot." },
      { name: "Saturn", periodDays: 10759, radiusEarth: 9.45, semiMajorAU: 9.58, color: "#eab308", fact: "Famous for spectacular ice and rock ring system." }
    ]
  },
  hd10180: {
    name: "HD 10180 System (Hydrus)",
    starColor: "#fef08a",
    starRadius: 20,
    planets: [
      { name: "HD 10180 c", periodDays: 5.76, radiusEarth: 3.5, semiMajorAU: 0.064, color: "#38bdf8", fact: "Hot Neptune with strong gravitational tugs on host star." },
      { name: "HD 10180 d", periodDays: 16.36, radiusEarth: 3.7, semiMajorAU: 0.128, color: "#34d399", fact: "Gas dwarf orbiting in a tight 3:1 resonance." },
      { name: "HD 10180 e", periodDays: 49.74, radiusEarth: 5.4, semiMajorAU: 0.270, color: "#fbbf24", fact: "Warm Saturn-mass world discovered by radial velocity." },
      { name: "HD 10180 f", periodDays: 122.7, radiusEarth: 5.6, semiMajorAU: 0.493, color: "#f87171", fact: "Located near the inner boundary of the habitable zone." },
      { name: "HD 10180 g", periodDays: 601.2, radiusEarth: 5.8, semiMajorAU: 1.422, color: "#c084fc", fact: "Massive gas world with a multi-year orbital period." }
    ]
  }
};

const container = document.getElementById('space-area');
const width = container.clientWidth || 650;
const height = container.clientHeight || 500;
const maxRadius = Math.min(width, height) / 2 - 20;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g')
  .attr('transform', `translate(${width / 2}, ${height / 2})`);

let currentSystemKey = "trappist1";
let currentScale = "pentatonic";
let speedMultiplier = 1.0;
let isRunning = true;
let animId = null;

// Audio Synthesizers
const synthPlanet = createSynth({ type: "fmSynth", harmonicity: 2.0, volume: -3 });
const synthStar = createSynth({ type: "polySynth", volume: -2 });

// Scales
const pitchScale = scalePitch()
  .domain([0, 7])
  .range(["C5", "C2"]) // Inner (high) -> Outer (deep bass)
  .scale(currentScale)
  .root("C");

const panScale = scalePan()
  .domain([-maxRadius, maxRadius])
  .range([-0.85, 0.85]);

let planetNodes = [];
let orbitRings = [];

function buildSystem(sysKey) {
  g.selectAll('*').remove();
  const sys = exoplanetSystems[sysKey];
  document.getElementById('system-status').innerText = sys.name;

  // Transit line (Top of orbit = 12 o'clock transit)
  g.append('line')
    .attr('class', 'transit-line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', -maxRadius);

  // Central Host Star
  const star = g.append('circle')
    .attr('class', 'star-core')
    .attr('r', sys.starRadius)
    .attr('fill', sys.starColor);

  const numPlanets = sys.planets.length;
  const radiusStep = (maxRadius - 35) / numPlanets;

  planetNodes = [];
  orbitRings = [];

  sys.planets.forEach((p, idx) => {
    const orbitR = 35 + (idx + 1) * radiusStep;
    const orbitalSpeed = (2 * Math.PI) / (Math.sqrt(p.periodDays) * 35); // Visual speed proxy

    // Orbit Ring
    const ring = g.append('circle')
      .attr('class', 'orbit-ring')
      .attr('r', orbitR);

    orbitRings.push(ring);

    // Planet Node
    const pGroup = g.append('g')
      .attr('class', 'planet-node')
      .attr('transform', `translate(0, ${-orbitR})`);

    pGroup.append('circle')
      .attr('r', Math.max(4, p.radiusEarth * 3.5))
      .attr('fill', p.color);

    planetNodes.push({
      data: p,
      index: idx,
      orbitR,
      speed: orbitalSpeed,
      angle: (idx * 0.9), // Initial phase offset
      group: pGroup,
      ring,
      lastTransitAngle: 0
    });

    pGroup.on('click', async function(event) {
      await defaultEngine.start();
      sonifyPlanet(p, idx, 0, this);
    });
  });
}

function sonifyPlanet(p, idx, posX, domElement) {
  const note = pitchScale(idx);
  const pan = panScale(posX);
  const vel = Math.min(1.0, 0.5 + p.radiusEarth * 0.05);

  synthPlanet.triggerAttackRelease(note, "8n", undefined, vel, { pan });

  document.getElementById('planet-title').innerHTML = `🪐 ${p.name} (Period: ${p.periodDays}d)`;
  document.getElementById('planet-desc').innerHTML = `
    <strong>Radius:</strong> ${p.radiusEarth} R⊕ &nbsp;|&nbsp; 
    <strong>Semi-Major:</strong> ${p.semiMajorAU} AU &nbsp;|&nbsp; 
    <strong>Tone:</strong> ${note}<br>
    ${p.fact}
  `;

  if (domElement) {
    choreography().movement("glow").intensity(1.8).duration(0.35)(domElement);
  }
}

function triggerStarTransit(p, idx) {
  const note = pitchScale(idx);
  synthStar.triggerAttackRelease(note, "16n", undefined, 0.7);

  // Star glow shockwave
  g.select('.star-core')
    .transition()
    .duration(80)
    .attr('r', exoplanetSystems[currentSystemKey].starRadius * 1.3)
    .transition()
    .duration(250)
    .attr('r', exoplanetSystems[currentSystemKey].starRadius);
}

// Orbital Animation Loop
let lastFrameTime = performance.now();

function updateOrbits(currentTime) {
  const dt = Math.min(0.1, (currentTime - lastFrameTime) / 1000);
  lastFrameTime = currentTime;

  for (let i = 0; i < planetNodes.length; i++) {
    const pn = planetNodes[i];
    const prevAngle = pn.angle;
    pn.angle += pn.speed * speedMultiplier * dt * 3.0;

    // Check 12 o'clock transit crossing (angle modulo 2PI)
    if (Math.floor(pn.angle / (2 * Math.PI)) > Math.floor(prevAngle / (2 * Math.PI))) {
      triggerStarTransit(pn.data, pn.index);
      choreography().movement("ripple").intensity(1.5).duration(0.4)(pn.group.node());
    }

    const px = Math.sin(pn.angle) * pn.orbitR;
    const py = -Math.cos(pn.angle) * pn.orbitR;

    pn.group.attr('transform', `translate(${px}, ${py})`);
  }

  if (isRunning) {
    animId = requestAnimationFrame(updateOrbits);
  }
}

buildSystem(currentSystemKey);
animId = requestAnimationFrame(updateOrbits);

// UI Controls
const toggleBtn = document.getElementById('toggle-orbit-btn');
toggleBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isRunning) {
    isRunning = false;
    if (animId) cancelAnimationFrame(animId);
    toggleBtn.innerText = "▶ Resume Planetary Symphony";
  } else {
    isRunning = true;
    lastFrameTime = performance.now();
    toggleBtn.innerText = "⏸ Pause Planetary Symphony";
    animId = requestAnimationFrame(updateOrbits);
  }
});

document.getElementById('system-select').addEventListener('change', (e) => {
  currentSystemKey = e.target.value;
  buildSystem(currentSystemKey);
});

document.getElementById('speed-slider').addEventListener('input', (e) => {
  speedMultiplier = +e.target.value;
  document.getElementById('speed-val').innerText = speedMultiplier.toFixed(1);
});

document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScale.scale(currentScale);
});
