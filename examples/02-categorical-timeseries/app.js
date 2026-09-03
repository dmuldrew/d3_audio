import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleSample,
  scaleTempo,
  audioLegend,
  choreography,
  defaultEngine,
  createSynth,
  createSamplePlayer
} from '../../src/index.js';

// 7 Discrete Daily Activity Categories
const ACTIVITIES = {
  sleep: {
    id: 'sleep',
    name: 'Deep Sleep & Rest',
    shortName: 'Sleep',
    icon: '😴',
    earcon: 'tom',
    color: '#6366f1',
    basePitch: 'C2',
    tempo: 70,
    pan: -0.75,
    soundDesc: 'Sub-Bass Breathing Pulse',
    desc: 'Restorative REM sleep & physiological recovery'
  },
  morning: {
    id: 'morning',
    name: 'Sunrise & Morning Prep',
    shortName: 'Morning',
    icon: '☕',
    earcon: 'blip',
    color: '#f59e0b',
    basePitch: 'G3',
    tempo: 90,
    pan: -0.4,
    soundDesc: 'Crisp Kalimba Pluck & Chime',
    desc: 'Mindful awakening, morning coffee & stretching'
  },
  commute: {
    id: 'commute',
    name: 'Transit & Commute',
    shortName: 'Commute',
    icon: '🚲',
    earcon: 'shaker',
    color: '#38bdf8',
    basePitch: 'C4',
    tempo: 115,
    pan: 0.0,
    soundDesc: '16th-Note Shaker & Hi-Hat Groove',
    desc: 'Brisk cycling, metro transit & active movement'
  },
  work: {
    id: 'work',
    name: 'Deep Focus Work',
    shortName: 'Deep Work',
    icon: '💻',
    earcon: 'kick',
    color: '#10b981',
    basePitch: 'E4',
    tempo: 120,
    pan: 0.75,
    soundDesc: 'Four-on-the-Floor Kick & Marimba',
    desc: 'Peak cognitive concentration & creative flow'
  },
  lunch: {
    id: 'lunch',
    name: 'Lunch & Social Connection',
    shortName: 'Lunch / Social',
    icon: '🥗',
    earcon: 'bell',
    color: '#ec4899',
    basePitch: 'G4',
    tempo: 105,
    pan: 0.2,
    soundDesc: 'Syncopated Bell & Acoustic Percussion',
    desc: 'Nutritious meal, fresh air & conversation'
  },
  fitness: {
    id: 'fitness',
    name: 'Fitness & High Energy',
    shortName: 'Fitness',
    icon: '🏃',
    earcon: 'clap',
    color: '#ef4444',
    basePitch: 'C5',
    tempo: 135,
    pan: 0.6,
    soundDesc: 'High-Energy Clap & Driving Bassline',
    desc: 'Cardiovascular sprints, athletics & peak heart rate'
  },
  evening: {
    id: 'evening',
    name: 'Evening Leisure & Unwind',
    shortName: 'Evening',
    icon: '🍷',
    earcon: 'laser',
    color: '#a855f7',
    basePitch: 'A3',
    tempo: 85,
    pan: -0.5,
    soundDesc: 'Warm Electric Piano Pad',
    desc: 'Dinner, reading, ambient music & relaxing'
  }
};

// 24-Hour Categorical Time-Series Schedules (Hours 0 to 23)
const SCHEDULES = {
  professional: [
    'sleep', 'sleep', 'sleep', 'sleep', 'sleep', 'sleep', // 00:00 - 05:00
    'morning', 'morning',                                   // 06:00 - 07:00
    'commute',                                             // 08:00
    'work', 'work', 'work',                                // 09:00 - 11:00
    'lunch', 'lunch',                                      // 12:00 - 13:00
    'work', 'work', 'work',                                // 14:00 - 16:00
    'commute',                                             // 17:00
    'fitness', 'fitness',                                  // 18:00 - 19:00
    'evening', 'evening', 'evening',                       // 20:00 - 22:00
    'sleep'                                                // 23:00
  ],
  nightowl: [
    'work', 'work', 'evening',                             // 00:00 - 02:00 (Late Night Flow!)
    'sleep', 'sleep', 'sleep', 'sleep', 'sleep', 'sleep', 'sleep', // 03:00 - 09:00
    'morning', 'morning',                                  // 10:00 - 11:00
    'lunch',                                               // 12:00
    'work', 'work', 'work', 'work',                        // 13:00 - 16:00
    'fitness',                                             // 17:00
    'evening', 'evening', 'evening',                       // 18:00 - 20:00
    'work', 'work', 'work'                                 // 21:00 - 23:00
  ],
  athlete: [
    'sleep', 'sleep', 'sleep', 'sleep', 'sleep',           // 00:00 - 04:00
    'fitness', 'fitness',                                  // 05:00 - 06:00 (Dawn workout!)
    'morning', 'morning',                                  // 07:00 - 08:00
    'work', 'work', 'work', 'work',                        // 09:00 - 12:00
    'lunch',                                               // 13:00
    'work', 'work', 'work',                                // 14:00 - 16:00
    'commute',                                             // 17:00
    'evening', 'evening', 'evening',                       // 18:00 - 20:00
    'sleep', 'sleep', 'sleep'                              // 21:00 - 23:00
  ]
};

let currentScheduleId = 'professional';
let currentHour = 14;
let isPlaying = false;
let playTimer = null;
let stepDurationMs = 220;

// Audio Engines
const samplePlayer = createSamplePlayer();
const melodySynth = createSynth({ type: "fmSynth", harmonicity: 2.0, volume: -4 });

// Scalers
const sampleScale = scaleSample()
  .domain(Object.keys(ACTIVITIES))
  .range(Object.values(ACTIVITIES).map(a => a.earcon));

const tempoScale = scaleTempo()
  .domain([70, 135])
  .range([70, 135]);

const pitchScale = scalePitch()
  .domain([0, 12, 23])
  .range(['C2', 'G4', 'C3']);

const panScale = scalePan()
  .domain([-1, 1])
  .range([-0.75, 0.75]);

// Mount Audio Legend
const legend = audioLegend()
  .title("Circadian Rhythms ⬄ Sound Palette")
  .sample(null, "Activity Earcons: Sleep (Tom), Morning (Blip), Commute (Shaker), Work (Kick), Fitness (Clap)")
  .pitch(pitchScale, "Circadian Energy (C2 Midnight ➔ G4 Midday ➔ C3 Bedtime)")
  .pan(panScale, "Life Domain: Home (Left -0.75) ↔ Transit (Center 0.0) ↔ Work/Gym (Right +0.75)");

d3.select("#legend-mount").call(legend);

// Setup D3 Canvas
const container = document.getElementById('chart-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 480;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

// Center Clock Group
const clockCenterX = width / 2;
const clockCenterY = 195;
const innerRadius = 75;
const outerRadius = 155;

const clockG = svg.append('g')
  .attr('transform', `translate(${clockCenterX}, ${clockCenterY})`);

// Ribbon Group (Horizontal Timeline at bottom)
const ribbonG = svg.append('g')
  .attr('transform', `translate(30, 395)`);
const ribbonW = width - 60;
const ribbonH = 34;

// Clock Background Dial
clockG.append('circle')
  .attr('r', outerRadius + 8)
  .attr('fill', '#040814')
  .attr('stroke', 'rgba(255,255,255,0.08)')
  .attr('stroke-width', 2);

// Center Hub
const centerHub = clockG.append('circle')
  .attr('r', innerRadius - 4)
  .attr('fill', '#070f22')
  .attr('stroke', 'var(--border)')
  .attr('stroke-width', 2);

// Center Hub Text Elements
const centerTimeText = clockG.append('text')
  .attr('text-anchor', 'middle')
  .attr('y', -10)
  .attr('fill', 'var(--gold)')
  .attr('font-size', '20px')
  .attr('font-weight', '800')
  .attr('font-family', 'monospace');

const centerIconText = clockG.append('text')
  .attr('text-anchor', 'middle')
  .attr('y', 15)
  .attr('font-size', '18px');

const centerBpmText = clockG.append('text')
  .attr('text-anchor', 'middle')
  .attr('y', 34)
  .attr('fill', 'var(--muted)')
  .attr('font-size', '10px')
  .attr('font-weight', '700');

// Rotating Needle
const needle = clockG.append('line')
  .attr('class', 'needle-line')
  .attr('x1', 0)
  .attr('y1', 0)
  .attr('x2', 0)
  .attr('y2', -outerRadius - 4)
  .attr('stroke', 'var(--gold)')
  .attr('stroke-width', 3.5)
  .attr('stroke-linecap', 'round');

clockG.append('circle')
  .attr('r', 5)
  .attr('fill', 'var(--gold)');

// Ribbon Playhead Marker
const ribbonPlayhead = ribbonG.append('rect')
  .attr('y', -3)
  .attr('height', ribbonH + 6)
  .attr('fill', 'none')
  .attr('stroke', 'var(--gold)')
  .attr('stroke-width', 2.5)
  .attr('rx', 3);

function getSchedule() {
  return SCHEDULES[currentScheduleId] || SCHEDULES.professional;
}

function updateHUD(hour) {
  const schedule = getSchedule();
  const actKey = schedule[hour];
  const act = ACTIVITIES[actKey];

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeString = `${String(hour).padStart(2, '0')}:00 (${displayHour}:00 ${ampm})`;

  document.getElementById('hud-time').innerText = timeString;
  document.getElementById('hud-activity').innerText = `${act.icon} ${act.name}`;
  document.getElementById('hud-activity').style.color = act.color;
  document.getElementById('hud-tempo').innerText = `${act.tempo} BPM`;
  document.getElementById('hud-instrument').innerText = act.soundDesc;

  document.getElementById('scrub-hour-val').innerText = `${String(hour).padStart(2, '0')}:00`;
  document.getElementById('hour-slider').value = hour;

  const badge = document.getElementById('active-category-badge');
  badge.innerText = `${act.icon} ${act.shortName} • ${act.tempo} BPM`;
  badge.style.background = `${act.color}25`;
  badge.style.color = act.color;

  // Center Hub
  centerTimeText.text(`${String(hour).padStart(2, '0')}:00`);
  centerIconText.text(act.icon);
  centerBpmText.text(`${act.tempo} BPM`);

  // Move Needle
  const angleDeg = (hour / 24) * 360;
  needle.attr('transform', `rotate(${angleDeg})`);

  // Move Ribbon Playhead
  const slotW = ribbonW / 24;
  ribbonPlayhead
    .attr('x', hour * slotW)
    .attr('width', slotW);
}

// Audition an Hour Step
async function auditionHour(hour) {
  await defaultEngine.start();
  updateHUD(hour);

  const schedule = getSchedule();
  const actKey = schedule[hour];
  const act = ACTIVITIES[actKey];

  const earcon = act.earcon;
  const note = act.basePitch;
  const panVal = act.pan;
  const gainVal = act.id === 'sleep' ? 0.45 : act.id === 'fitness' ? 0.95 : 0.75;

  // 1. Trigger Percussive Rhythmic Earcon
  samplePlayer.trigger(earcon, "16n", undefined, gainVal, { pan: panVal });

  // 2. Trigger Melodic Pitch / Harmonic Interval
  if (act.id === 'work') {
    // Four-on-the-floor kick + rapid marimba arpeggio
    melodySynth.triggerAttackRelease(["E4", "G4"], "16n", undefined, gainVal * 0.7, { pan: panVal });
  } else if (act.id === 'commute') {
    // 16th shaker syncopated pulse
    melodySynth.triggerAttackRelease("C4", "32n", undefined, gainVal * 0.6, { pan: panVal });
  } else if (act.id === 'fitness') {
    // Punchy energetic clap + power chord
    melodySynth.triggerAttackRelease(["C4", "G4", "C5"], "8n", undefined, gainVal * 0.85, { pan: panVal });
  } else if (act.id === 'morning') {
    // Rising kalimba fifth
    melodySynth.triggerAttackRelease(["G3", "D4"], "8n", undefined, gainVal * 0.65, { pan: panVal });
  } else if (act.id === 'lunch') {
    // Warm bell triad
    melodySynth.triggerAttackRelease(["F4", "A4"], "8n", undefined, gainVal * 0.65, { pan: panVal });
  } else if (act.id === 'evening') {
    // Smooth mellow seventh
    melodySynth.triggerAttackRelease(["A3", "C4", "E4"], "4n", undefined, gainVal * 0.6, { pan: panVal });
  } else {
    // Sleep: gentle sub-bass hum
    melodySynth.triggerAttackRelease("C2", "2n", undefined, gainVal * 0.5, { pan: panVal });
  }

  // 3. Visual Kinetic Pulse on Active Hour Wedge
  const wedgeNode = clockG.select(`.wedge-hour-${hour}`).node();
  if (wedgeNode) {
    choreography().movement("pulse").intensity(1.25).duration(0.25)(wedgeNode);
  }
}

// Render Clock & Ribbon
function renderVisualization() {
  const schedule = getSchedule();
  clockG.selectAll('.wedge-group').remove();
  ribbonG.selectAll('.ribbon-cell').remove();
  ribbonG.selectAll('.ribbon-text').remove();

  // Draw 24 Clock Wedges
  const arcGen = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(d => (d / 24) * 2 * Math.PI)
    .endAngle(d => ((d + 1) / 24) * 2 * Math.PI)
    .padAngle(0.015)
    .padRadius(innerRadius);

  const wedgeGroups = clockG.append('g').attr('class', 'wedge-group');

  for (let h = 0; h < 24; h++) {
    const actKey = schedule[h];
    const act = ACTIVITIES[actKey];

    const path = wedgeGroups.append('path')
      .attr('class', `hour-wedge wedge-hour-${h}`)
      .attr('d', arcGen(h))
      .attr('fill', act.color)
      .attr('opacity', 0.8)
      .attr('stroke', '#070c18')
      .attr('stroke-width', 1.5);

    path.on('click', () => {
      currentHour = h;
      auditionHour(h);
    });
  }

  // Add 4 Cardinal Hour Labels (12 AM, 6 AM, 12 PM, 6 PM)
  const hourLabels = [
    { hour: 0, text: '12 AM (Midnight)', angle: 0 },
    { hour: 6, text: '6 AM', angle: 90 },
    { hour: 12, text: '12 PM (Noon)', angle: 180 },
    { hour: 18, text: '6 PM', angle: 270 }
  ];

  wedgeGroups.selectAll('.hour-label')
    .data(hourLabels)
    .enter()
    .append('text')
    .attr('class', 'hour-label')
    .attr('transform', d => {
      const rad = (d.angle - 90) * (Math.PI / 180);
      const r = outerRadius + 18;
      return `translate(${r * Math.cos(rad)}, ${r * Math.sin(rad) + 4})`;
    })
    .attr('text-anchor', 'middle')
    .attr('fill', '#94a3b8')
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .text(d => d.text);

  // Render Horizontal Ribbon
  const slotW = ribbonW / 24;
  for (let h = 0; h < 24; h++) {
    const actKey = schedule[h];
    const act = ACTIVITIES[actKey];

    const cell = ribbonG.append('rect')
      .attr('class', 'ribbon-cell')
      .attr('x', h * slotW)
      .attr('y', 0)
      .attr('width', slotW - 1)
      .attr('height', ribbonH)
      .attr('fill', act.color)
      .attr('opacity', 0.85)
      .attr('rx', 2)
      .style('cursor', 'pointer');

    cell.on('click', () => {
      currentHour = h;
      auditionHour(h);
    });

    // Hour number on top
    if (h % 3 === 0) {
      ribbonG.append('text')
        .attr('class', 'ribbon-text')
        .attr('x', h * slotW + slotW / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(`${h}h`);
    }
  }

  // Put needle and playhead on top
  needle.raise();
  ribbonPlayhead.raise();
  updateHUD(currentHour);
}

// Clock Loop Progression
function stepClock() {
  currentHour = (currentHour + 1) % 24;
  auditionHour(currentHour);
}

// Transport Button
const playBtn = document.getElementById('toggle-play-btn');
playBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isPlaying) {
    clearInterval(playTimer);
    isPlaying = false;
    playBtn.innerText = "▶ Play Circadian Groove";
  } else {
    isPlaying = true;
    playBtn.innerText = "⏸ Pause Circadian Groove";
    stepClock();
    playTimer = setInterval(stepClock, stepDurationMs);
  }
});

// Jump to Current Real-World Hour
document.getElementById('jump-now-btn').addEventListener('click', () => {
  const realHour = new Date().getHours();
  currentHour = realHour;
  auditionHour(currentHour);
});

// Schedule Selector
document.getElementById('schedule-select').addEventListener('change', (e) => {
  currentScheduleId = e.target.value;
  renderVisualization();
  auditionHour(currentHour);
});

// Scrubber Slider
document.getElementById('hour-slider').addEventListener('input', (e) => {
  currentHour = +e.target.value;
  auditionHour(currentHour);
});

// Speed Slider
document.getElementById('speed-slider').addEventListener('input', (e) => {
  stepDurationMs = +e.target.value;
  document.getElementById('speed-val').innerText = stepDurationMs;
  if (isPlaying) {
    clearInterval(playTimer);
    playTimer = setInterval(stepClock, stepDurationMs);
  }
});

// Initial Setup
renderVisualization();
updateHUD(currentHour);
