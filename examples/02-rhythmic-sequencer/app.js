import {
  timeline,
  scalePitch,
  scaleGain,
  choreography,
  defaultEngine,
  createSynth,
  createSamplePlayer
} from '/dist/d3-audio.js';

const NUM_STEPS = 16;

const TRACKS_CONFIG = [
  { id: 'kick', name: 'Kick Drum (808)', type: 'sample', sound: 'kick', defaultMove: 'bounce', color: '#ef4444' },
  { id: 'snare', name: 'Snare / Clap', type: 'sample', sound: 'snare', defaultMove: 'shake', color: '#f59e0b' },
  { id: 'hihat', name: 'Hi-Hat (16ths)', type: 'sample', sound: 'hihat', defaultMove: 'ripple', color: '#10b981' },
  { id: 'bass', name: 'Synth Bassline', type: 'synth', pitch: 'C2', defaultMove: 'flip', color: '#a855f7' }
];

// Patterns state: 4 rows x 16 steps
const gridState = {
  kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  bass:  [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0]
};

const movementsState = {
  kick: 'bounce',
  snare: 'shake',
  hihat: 'wiggle',
  bass: 'flip'
};

const bassPitchScale = scalePitch()
  .domain([0, 15])
  .range(["C2", "G3"])
  .scale("minor")
  .root("C");

const samplePlayer = createSamplePlayer();
const bassSynth = createSynth({ type: "fmSynth" });

// Setup timeline
const tl = timeline({ bpm: 128, loop: true, loopEnd: "1m" });

// Setup Multi-Tracks on Timeline
const kickTrack = tl.track("kick", { type: "sample", instrument: samplePlayer });
const snareTrack = tl.track("snare", { type: "sample", instrument: samplePlayer });
const hihatTrack = tl.track("hihat", { type: "sample", instrument: samplePlayer });
const bassTrack = tl.track("bass", { type: "synth", instrument: bassSynth });

function rebuildTracks() {
  const kickData = [];
  const snareData = [];
  const hihatData = [];
  const bassData = [];

  for (let i = 0; i < NUM_STEPS; i++) {
    const timePos = (i * 0.25) / 4 * 4; // '0:0:0', '0:0:1', etc.
    const timeStr = `0:${Math.floor(i / 4)}:${i % 4}`;

    if (gridState.kick[i]) {
      kickData.push({ step: i, time: timeStr, sample: 'kick', gain: 0.9 });
    }
    if (gridState.snare[i]) {
      snareData.push({ step: i, time: timeStr, sample: 'snare', gain: 0.85 });
    }
    if (gridState.hihat[i]) {
      hihatData.push({ step: i, time: timeStr, sample: (i % 4 === 2 ? 'openhat' : 'hihat'), gain: (i % 2 === 0 ? 0.7 : 0.4) });
    }
    if (gridState.bass[i]) {
      bassData.push({ step: i, time: timeStr, pitch: bassPitchScale(i), gain: 0.8, duration: "16n" });
    }
  }

  kickTrack.data(kickData).time(d => d.time).sample(d => d.sample).gain(d => d.gain);
  snareTrack.data(snareData).time(d => d.time).sample(d => d.sample).gain(d => d.gain);
  hihatTrack.data(hihatData).time(d => d.time).sample(d => d.sample).gain(d => d.gain);
  bassTrack.data(bassData).time(d => d.time).pitch(d => d.pitch).gain(d => d.gain).duration(d => d.duration);

  if (tl.isPlaying) {
    tl.schedule();
  }
}

// Render DOM Sequencer Grid
const gridContainer = document.getElementById('sequencer-grid');
const stepTileRefs = {};

TRACKS_CONFIG.forEach(track => {
  stepTileRefs[track.id] = [];

  const row = document.createElement('div');
  row.className = 'track-row';

  // Track Meta Controls
  const meta = document.createElement('div');
  meta.className = 'track-meta';
  meta.innerHTML = `
    <span class="track-name" style="color: ${track.color};">${track.name}</span>
    <select class="track-select" data-track="${track.id}">
      <option value="wiggle" ${movementsState[track.id] === 'wiggle' ? 'selected' : ''}>Movement: Wiggle</option>
      <option value="flip" ${movementsState[track.id] === 'flip' ? 'selected' : ''}>Movement: 3D Flip</option>
      <option value="pulse" ${movementsState[track.id] === 'pulse' ? 'selected' : ''}>Movement: Pulse</option>
      <option value="bounce" ${movementsState[track.id] === 'bounce' ? 'selected' : ''}>Movement: Bounce</option>
      <option value="shake" ${movementsState[track.id] === 'shake' ? 'selected' : ''}>Movement: Shake</option>
      <option value="ripple" ${movementsState[track.id] === 'ripple' ? 'selected' : ''}>Movement: Ripple</option>
      <option value="glow" ${movementsState[track.id] === 'glow' ? 'selected' : ''}>Movement: Glow</option>
      <option value="squash" ${movementsState[track.id] === 'squash' ? 'selected' : ''}>Movement: Squash</option>
    </select>
  `;

  // Step Buttons
  const btnGroup = document.createElement('div');
  btnGroup.className = 'step-buttons';

  for (let i = 0; i < NUM_STEPS; i++) {
    const tile = document.createElement('div');
    tile.className = `step-tile ${track.id} ${gridState[track.id][i] ? 'active' : ''} ${i % 4 === 0 ? 'beat-accent' : ''}`;
    tile.innerText = i + 1;

    tile.addEventListener('click', async () => {
      await defaultEngine.start();
      gridState[track.id][i] = gridState[track.id][i] ? 0 : 1;
      tile.classList.toggle('active', !!gridState[track.id][i]);

      // Audition on click
      if (gridState[track.id][i]) {
        triggerTrackAction(track.id, i, tile);
      }

      rebuildTracks();
    });

    stepTileRefs[track.id].push(tile);
    btnGroup.appendChild(tile);
  }

  row.appendChild(meta);
  row.appendChild(btnGroup);
  gridContainer.appendChild(row);
});

// Movement change listener
document.querySelectorAll('.track-select').forEach(sel => {
  sel.addEventListener('change', (e) => {
    const trackId = e.target.getAttribute('data-track');
    movementsState[trackId] = e.target.value;
  });
});

function triggerTrackAction(trackId, stepIndex, tileEl) {
  const moveType = movementsState[trackId] || 'wiggle';
  choreography().movement(moveType).intensity(1.3).duration(0.3)(tileEl);

  if (trackId === 'bass') {
    bassSynth.triggerAttackRelease(bassPitchScale(stepIndex), "16n");
  } else {
    samplePlayer.trigger(trackId, "16n");
  }
}

// Visual lockstep event handler for sequencer playback
tl.on('step', ({ event, track }) => {
  const stepIdx = event.datum.step;
  const trackId = track.name;
  const tile = stepTileRefs[trackId] && stepTileRefs[trackId][stepIdx];

  if (tile) {
    const moveType = movementsState[trackId] || 'wiggle';
    choreography().movement(moveType).intensity(1.4).duration(0.32)(tile);
  }
});

// Global step ticker highlight
let lastStep = -1;
tl.on('progress', ({ position }) => {
  if (!position) return;
  // position is "bars:quarters:sixteenths" e.g. "0:2:3"
  const parts = position.split(':').map(Number);
  const currentStep = (parts[1] * 4 + Math.floor(parts[2])) % NUM_STEPS;

  if (currentStep !== lastStep) {
    // Remove highlight from previous
    TRACKS_CONFIG.forEach(t => {
      if (lastStep >= 0 && stepTileRefs[t.id][lastStep]) {
        stepTileRefs[t.id][lastStep].classList.remove('current-step');
      }
      if (stepTileRefs[t.id][currentStep]) {
        stepTileRefs[t.id][currentStep].classList.add('current-step');
      }
    });
    lastStep = currentStep;
  }
});

// Presets loader
const PRESETS_DATA = {
  electro: {
    kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bass:  [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0]
  },
  house: {
    kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass:  [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0]
  },
  trap: {
    kick:  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bass:  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0]
  },
  glitch: {
    kick:  [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    snare: [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    hihat: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
    bass:  [1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1]
  },
  clear: {
    kick:  new Array(16).fill(0),
    snare: new Array(16).fill(0),
    hihat: new Array(16).fill(0),
    bass:  new Array(16).fill(0)
  }
};

document.querySelectorAll('.btn-preset').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const key = e.target.getAttribute('data-preset');
    if (PRESETS_DATA[key]) {
      TRACKS_CONFIG.forEach(t => {
        gridState[t.id] = [...PRESETS_DATA[key][t.id]];
        for (let i = 0; i < NUM_STEPS; i++) {
          stepTileRefs[t.id][i].classList.toggle('active', !!gridState[t.id][i]);
        }
      });
      rebuildTracks();
    }
  });
});

// Transport controls
const playBtn = document.getElementById('play-btn');
playBtn.addEventListener('click', async () => {
  if (tl.isPlaying) {
    tl.pause();
    playBtn.innerText = "▶ Start Sequencer";
  } else {
    rebuildTracks();
    await tl.play();
    playBtn.innerText = "⏸ Pause Sequencer";
  }
});

document.getElementById('bpm-slider').addEventListener('input', (e) => {
  const bpm = +e.target.value;
  document.getElementById('bpm-val').innerText = bpm;
  tl.bpm(bpm);
});

rebuildTracks();
