import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleFilter,
  choreography,
  defaultEngine,
  createSynth
} from '../../src/index.js';

const container = document.getElementById('flow-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 480;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

let particleCount = 160;
let vortexStrength = 5;
let particles = [];
let vortices = [
  { x: width * 0.35, y: height * 0.45, power: 1.5 },
  { x: width * 0.65, y: height * 0.55, power: -1.2 }
];

function initParticles(count) {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      speed: 0,
      radius: 2 + Math.random() * 3,
      hue: Math.floor(Math.random() * 60) + 180,
      lastTrigger: 0
    });
  }
}

initParticles(particleCount);

// Scales
let currentScale = 'hirajoshi';

const pitchScale = scalePitch()
  .domain([0, 8])
  .range(["C3", "C6"])
  .scale(currentScale)
  .root("C");

const filterScale = scaleFilter()
  .domain([0, 8])
  .range([400, 7000]);

const panScale = scalePan()
  .domain([0, width])
  .range([-0.9, 0.9]);

const synth = createSynth({
  type: "fmSynth",
  harmonicity: 3.0,
  volume: -4
});

// Render Vortex Group
const vortexGroup = svg.append('g');

function renderVortices() {
  vortexGroup.selectAll('*').remove();
  vortexGroup.selectAll('.vortex-node')
    .data(vortices)
    .enter()
    .append('circle')
    .attr('class', 'vortex-node')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', 8)
    .attr('fill', d => d.power > 0 ? '#f43f5e' : '#a855f7');
}

renderVortices();

// Render Particles
const particleGroup = svg.append('g');
let particleCircles = particleGroup.selectAll('circle')
  .data(particles)
  .enter()
  .append('circle')
  .attr('class', 'particle')
  .attr('r', d => d.radius)
  .attr('fill', d => `hsl(${d.hue}, 90%, 65%)`)
  .attr('opacity', 0.85);

// Add click attractor
svg.on('click', async function(event) {
  await defaultEngine.start();
  const [mx, my] = d3.pointer(event, this);
  vortices.push({ x: mx, y: my, power: Math.random() > 0.5 ? 1.8 : -1.5 });
  renderVortices();

  choreography()
    .movement("ripple")
    .intensity(2.0)
    .duration(0.5)(this);
});

// Simulation Loop
let isRunning = false;
let animId = null;
let lastAudioTick = 0;

function updatePhysics(time) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Flow Field Vector (Perlin / Trig approximation)
    const angle = (Math.sin(p.x * 0.005) + Math.cos(p.y * 0.005)) * Math.PI;
    p.vx += Math.cos(angle) * 0.15;
    p.vy += Math.sin(angle) * 0.15;

    // Apply Vortex Forces
    for (const v of vortices) {
      const dx = v.x - p.x;
      const dy = v.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 10;
      if (dist < 220) {
        const force = (v.power * (vortexStrength / 5) * 40) / (dist * dist);
        // Tangential swirl + radial pull
        p.vx += (-dy * force * 0.8) + (dx * force * 0.2);
        p.vy += (dx * force * 0.8) + (dy * force * 0.2);
      }
    }

    // Dampen velocity
    p.vx *= 0.96;
    p.vy *= 0.96;

    p.x += p.vx;
    p.y += p.vy;

    p.speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

    // Screen wrapping
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;
  }

  // Update DOM
  particleCircles
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);

  // Trigger generative audio periodically for fastest energetic particles
  if (time - lastAudioTick > 140) {
    lastAudioTick = time;
    // Pick random fast particle
    const fastParticles = particles.filter(p => p.speed > 2.5);
    if (fastParticles.length > 0) {
      const p = fastParticles[Math.floor(Math.random() * fastParticles.length)];
      const note = pitchScale(Math.min(8, p.speed * 1.5));
      const pan = panScale(p.x);
      const cutoff = filterScale(p.speed);

      synth.triggerAttackRelease(note, "16n", undefined, 0.7, { pan, filter: cutoff });
      document.getElementById('swarm-status').innerText = `Swarm Note: ${note} (Speed: ${p.speed.toFixed(1)}, Pan: ${pan.toFixed(2)})`;
    }
  }

  if (isRunning) {
    animId = requestAnimationFrame(updatePhysics);
  }
}

const toggleBtn = document.getElementById('toggle-swarm-btn');
toggleBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isRunning) {
    isRunning = false;
    if (animId) cancelAnimationFrame(animId);
    toggleBtn.innerText = "▶ Start Generative Swarm";
  } else {
    isRunning = true;
    toggleBtn.innerText = "⏸ Pause Generative Swarm";
    animId = requestAnimationFrame(updatePhysics);
  }
});

document.getElementById('clear-vortex-btn').addEventListener('click', () => {
  vortices = [];
  renderVortices();
});

document.getElementById('particle-count').addEventListener('input', (e) => {
  particleCount = +e.target.value;
  document.getElementById('count-val').innerText = particleCount;
  initParticles(particleCount);
  particleGroup.selectAll('*').remove();
  particleCircles = particleGroup.selectAll('circle')
    .data(particles)
    .enter()
    .append('circle')
    .attr('class', 'particle')
    .attr('r', d => d.radius)
    .attr('fill', d => `hsl(${d.hue}, 90%, 65%)`)
    .attr('opacity', 0.85);
});

document.getElementById('vortex-strength').addEventListener('input', (e) => {
  vortexStrength = +e.target.value;
});

document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScale.scale(currentScale);
});
