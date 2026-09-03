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

const container = document.getElementById('board-area');
const width = container.clientWidth || 650;
const height = container.clientHeight || 520;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

// Galton Board Geometry
const NUM_ROWS = 10;
const NUM_BINS = NUM_ROWS + 1;
const startY = 50;
const rowHeight = 28;
const pegSpacing = 32;
const binY = startY + NUM_ROWS * rowHeight + 25;
const binHeight = 120;

const bins = new Array(NUM_BINS).fill(0);
let probabilityBias = 0.50;
let currentScale = 'pentatonic';

// Synthesizers
const synthBounce = createSynth({ type: "pluckSynth", volume: -4 });
const synthBin = createSynth({ type: "polySynth", volume: -3 });
const drums = createSamplePlayer();

// Scales
const pitchScale = scalePitch()
  .domain([0, NUM_BINS - 1])
  .range(["C3", "C6"])
  .scale(currentScale)
  .root("C");

const panScale = scalePan()
  .domain([0, NUM_BINS - 1])
  .range([-0.85, 0.85]);

// Interactive Audio Legend
const legend = audioLegend()
  .title("Probability & Normal Distribution Audio Key")
  .pitch(pitchScale, "Binomial Peg Deflection (L ➔ R)")
  .pan(panScale, "Stereo Acoustic Field (L ↔ R)")
  .sample(null, "Central Limit Bell Bin Accumulation");

d3.select("#legend-mount").call(legend);

// Draw Peg Matrix
const pegGroup = svg.append('g');
const pegs = [];

for (let r = 0; r < NUM_ROWS; r++) {
  const numPegs = r + 1;
  const rowStartX = width / 2 - ((numPegs - 1) * pegSpacing) / 2;
  const py = startY + r * rowHeight;

  for (let c = 0; c < numPegs; c++) {
    const px = rowStartX + c * pegSpacing;
    pegGroup.append('circle')
      .attr('class', 'peg')
      .attr('cx', px)
      .attr('cy', py)
      .attr('r', 3.5);

    pegs.push({ row: r, col: c, x: px, y: py });
  }
}

// Draw Histogram Bins
const binGroup = svg.append('g');
const binWidth = pegSpacing - 4;
const binStartX = width / 2 - ((NUM_BINS - 1) * pegSpacing) / 2 - binWidth / 2;

const binBars = binGroup.selectAll('.bin-bar')
  .data(bins)
  .enter()
  .append('rect')
  .attr('class', 'bin-bar')
  .attr('x', (d, i) => binStartX + i * pegSpacing)
  .attr('y', binY + binHeight)
  .attr('width', binWidth)
  .attr('height', 0)
  .attr('rx', 3);

// Ball Particle Management
const ballGroup = svg.append('g');

async function dropSingleBall() {
  await defaultEngine.start();
  let currentX = width / 2;
  let currentY = 20;
  let col = 0;

  const ball = ballGroup.append('circle')
    .attr('class', 'ball')
    .attr('cx', currentX)
    .attr('cy', currentY)
    .attr('r', 4);

  for (let r = 0; r < NUM_ROWS; r++) {
    const stepRight = Math.random() < probabilityBias;
    if (stepRight) col++;

    const nextY = startY + r * rowHeight;
    const numPegs = r + 1;
    const rowStartX = width / 2 - ((numPegs - 1) * pegSpacing) / 2;
    const nextX = rowStartX + col * pegSpacing;

    await new Promise(res => {
      ball.transition()
        .duration(45)
        .ease(d3.easeQuadIn)
        .attr('cx', nextX)
        .attr('cy', nextY)
        .on('end', () => {
          // Play peg collision chime
          const note = pitchScale(col);
          const pan = panScale(col);
          synthBounce.triggerAttackRelease(note, "32n", undefined, 0.45, { pan });
          res();
        });
    });
  }

  // Land in Bin
  const finalBin = Math.max(0, Math.min(NUM_BINS - 1, col));
  const targetBinX = binStartX + finalBin * pegSpacing + binWidth / 2;
  const targetBinY = binY + binHeight - 5;

  await new Promise(res => {
    ball.transition()
      .duration(60)
      .ease(d3.easeBounceOut)
      .attr('cx', targetBinX)
      .attr('cy', targetBinY)
      .on('end', () => {
        ball.remove();
        res();
      });
  });

  // Accumulate Bin
  bins[finalBin]++;
  updateHistogram(finalBin);
}

function updateHistogram(activeBin) {
  const maxCount = Math.max(1, d3.max(bins));
  const yScale = d3.scaleLinear().domain([0, Math.max(15, maxCount)]).range([0, binHeight - 10]);

  binBars
    .transition()
    .duration(80)
    .attr('y', d => binY + binHeight - yScale(d))
    .attr('height', d => yScale(d))
    .attr('fill', (d, i) => i === activeBin ? '#fbbf24' : '#38bdf8');

  // Bin Landing harmonic note
  const binNote = pitchScale(activeBin);
  const pan = panScale(activeBin);
  synthBin.triggerAttackRelease(binNote, "16n", undefined, 0.7, { pan });

  const activeBarNode = binBars.nodes()[activeBin];
  if (activeBarNode) {
    choreography().movement("pulse").intensity(1.3).duration(0.25)(activeBarNode);
  }
}

// Swarm Drop Mode
let isSwarming = false;
let swarmTimer = null;

async function triggerSwarm(count = 100) {
  for (let i = 0; i < count; i++) {
    dropSingleBall();
    await new Promise(r => setTimeout(r, 60));
  }
}

document.getElementById('drop-swarm-btn').addEventListener('click', async () => {
  await defaultEngine.start();
  triggerSwarm(50);
});

document.getElementById('reset-board-btn').addEventListener('click', () => {
  for (let i = 0; i < NUM_BINS; i++) bins[i] = 0;
  binBars.attr('y', binY + binHeight).attr('height', 0);
});

document.getElementById('prob-slider').addEventListener('input', (e) => {
  probabilityBias = +e.target.value;
  document.getElementById('prob-val').innerText = probabilityBias.toFixed(2);
});

document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScale.scale(currentScale);
});
