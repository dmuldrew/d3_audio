import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleFilter,
  audioLegend,
  choreography,
  defaultEngine,
  createSynth,
  createSamplePlayer
} from '/src/index.js';

// Biochemical Amino Acid Reference Tables
const aminoAcidProperties = {
  // Hydrophobic / Aliphatic
  A: { name: "Alanine", family: "Hydrophobic", hydropathy: 1.8, mass: 89, color: "#38bdf8" },
  V: { name: "Valine", family: "Hydrophobic", hydropathy: 4.2, mass: 117, color: "#0284c7" },
  L: { name: "Leucine", family: "Hydrophobic", hydropathy: 3.8, mass: 131, color: "#0369a1" },
  I: { name: "Isoleucine", family: "Hydrophobic", hydropathy: 4.5, mass: 131, color: "#075985" },
  M: { name: "Methionine", family: "Hydrophobic", hydropathy: 1.9, mass: 149, color: "#0c4a6e" },
  P: { name: "Proline", family: "Hydrophobic", hydropathy: -1.6, mass: 115, color: "#60a5fa" },

  // Aromatic
  F: { name: "Phenylalanine", family: "Aromatic", hydropathy: 2.8, mass: 165, color: "#fbbf24" },
  Y: { name: "Tyrosine", family: "Aromatic", hydropathy: -1.3, mass: 181, color: "#f59e0b" },
  W: { name: "Tryptophan", family: "Aromatic", hydropathy: -0.9, mass: 204, color: "#d97706" },

  // Polar / Uncharged
  S: { name: "Serine", family: "Polar", hydropathy: -0.8, mass: 105, color: "#34d399" },
  T: { name: "Threonine", family: "Polar", hydropathy: -0.7, mass: 119, color: "#10b981" },
  C: { name: "Cysteine", family: "Polar", hydropathy: 2.5, mass: 121, color: "#059669" },
  N: { name: "Asparagine", family: "Polar", hydropathy: -3.5, mass: 132, color: "#6ee7b7" },
  Q: { name: "Glutamine", family: "Polar", hydropathy: -3.5, mass: 146, color: "#a7f3d0" },

  // Acidic (Negatively Charged)
  D: { name: "Aspartate", family: "Acidic (-)", hydropathy: -3.5, mass: 133, color: "#f43f5e" },
  E: { name: "Glutamate", family: "Acidic (-)", hydropathy: -3.5, mass: 147, color: "#e11d48" },

  // Basic (Positively Charged)
  K: { name: "Lysine", family: "Basic (+)", hydropathy: -3.9, mass: 146, color: "#c084fc" },
  R: { name: "Arginine", family: "Basic (+)", hydropathy: -4.5, mass: 174, color: "#a855f7" },
  H: { name: "Histidine", family: "Basic (+)", hydropathy: -3.2, mass: 155, color: "#9333ea" },

  // Conformational special
  G: { name: "Glycine", family: "Special Hinge", hydropathy: -0.4, mass: 75, color: "#94a3b8" }
};

// DNA Nucleotides
const dnaProperties = {
  A: { name: "Adenine", family: "Purine", hydropathy: 0.0, mass: 135, color: "#10b981", pitch: "C3" },
  T: { name: "Thymine", family: "Pyrimidine", hydropathy: 0.0, mass: 126, color: "#f43f5e", pitch: "G3" },
  C: { name: "Cytosine", family: "Pyrimidine", hydropathy: 0.0, mass: 111, color: "#38bdf8", pitch: "E3" },
  G: { name: "Guanine", family: "Purine", hydropathy: 0.0, mass: 151, color: "#fbbf24", pitch: "C4" }
};

// Real Biological Sequences
const macromolecules = {
  insulin: {
    name: "Human Insulin (51 Residues, Dual Chains)",
    type: "protein",
    seq: "GIVEQCCTSICSLYQLENYCNFVNQHLCGSHLVEALYLVCGERGFFYTPKT".split("")
  },
  gfp: {
    name: "Green Fluorescent Protein Chromophore Loop (GFP)",
    type: "protein",
    seq: "MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTLTYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIEL".split("").slice(0, 48)
  },
  hemoglobin: {
    name: "Hemoglobin β (Residues 1-35, Glu6 Mutation Site)",
    type: "protein",
    seq: "VHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYP".split("")
  },
  dnaStrand: {
    name: "DNA Double Helix Coding Strand (A, T, C, G)",
    type: "dna",
    seq: "ATGCGATCGATCGATCGATCGAATCGATCGATCGAATCGATCGATCGATC".split("")
  }
};

const container = document.getElementById('molecular-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 480;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g');

let currentMolKey = "insulin";
let currentMovement = "pulse";
let stepInterval = 160;

// Audio Synthesizers for Categorical Classes
const synthPluck = createSynth({ type: "pluckSynth", volume: -2 });
const synthFM = createSynth({ type: "fmSynth", harmonicity: 2.5, volume: -3 });
const synthBass = createSynth({ type: "polySynth", volume: -2 });
const synthLead = createSynth({ type: "polySynth", volume: -3 });
const drums = createSamplePlayer();

// Continuous Scalers
const hydropathyFilter = scaleFilter().domain([-4.5, 4.5]).range([300, 7500]);
const hydropathyPan = scalePan().domain([-4.5, 4.5]).range([-0.85, 0.85]);
const massGain = scaleGain().domain([75, 210]).range([0.45, 0.95]);
const pitchScale = scalePitch().domain([-4.5, 4.5]).range(["C3", "C6"]).scale("pentatonic");

// 1. Build and Mount Interactive Audio Legend
const legend = audioLegend()
  .title("Biochemical ⬄ Sound Mapping Key")
  .pitch(pitchScale, "Hydropathy Index (-4.5 to +4.5)")
  .gain(massGain, "Molecular Mass (75 to 210 Da)")
  .filter(hydropathyFilter, "Filter Brightness (Solvent Exposure)")
  .pan(hydropathyPan, "Stereo Spatial Field (L ↔ R)")
  .sample(null, "Glycine Conformational Hinge (Woodblock)");

d3.select("#legend-mount").call(legend);

// 2. Render Macromolecule Visual Ribbon & Nodes
let currentNodes = [];
let backboneLine = null;

function renderMolecule(molKey) {
  g.selectAll('*').remove();
  const mol = macromolecules[molKey];
  document.getElementById('molecule-status').innerText = mol.name;

  const N = mol.seq.length;
  const points = [];

  // Generate 2D folding path (alpha-helix spiral / beta strand folding)
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const angle = i * 0.45;
    const wave = Math.sin(t * Math.PI * 3) * 60;
    const x = 50 + t * (width - 100) + Math.cos(angle) * 15;
    const y = height / 2 + wave + Math.sin(angle) * 35;

    const char = mol.seq[i];
    const props = mol.type === 'protein'
      ? (aminoAcidProperties[char] || aminoAcidProperties.A)
      : (dnaProperties[char] || dnaProperties.A);

    points.push({ index: i, char, props, x, y });
  }

  // Draw Backbone Line
  const spline = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveCatmullRom.alpha(0.5));
  backboneLine = g.append('path')
    .datum(points)
    .attr('class', 'backbone-path')
    .attr('d', spline);

  // Draw Residue Nodes
  currentNodes = g.selectAll('.residue-node')
    .data(points)
    .enter()
    .append('g')
    .attr('class', 'residue-node')
    .attr('transform', d => `translate(${d.x}, ${d.y})`);

  currentNodes.append('circle')
    .attr('r', d => Math.max(5, Math.sqrt(d.props.mass) * 1.0))
    .attr('fill', d => d.props.color)
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 1.5);

  currentNodes.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '.3em')
    .attr('fill', '#040811')
    .attr('font-size', '9px')
    .attr('font-weight', '800')
    .attr('pointer-events', 'none')
    .text(d => d.char);

  currentNodes.on('mouseenter click', async function(event, d) {
    await defaultEngine.start();
    sonifyResidue(d, this);
  });
}

// 3. Biochemical Sonification Logic
function sonifyResidue(d, domElement) {
  const p = d.props;
  const note = pitchScale(p.hydropathy);
  const cutoff = hydropathyFilter(p.hydropathy);
  const pan = hydropathyPan(p.hydropathy);
  const vel = massGain(p.mass);

  // Categorical Timbre Dispatch based on Amino Acid / DNA Family
  if (d.char === 'G') {
    // Glycine hinge
    drums.trigger("blip", "32n", undefined, 0.9, { pan });
  } else if (p.family && p.family.includes("Aromatic")) {
    synthFM.triggerAttackRelease(note, "8n", undefined, vel, { pan, filter: cutoff });
  } else if (p.family && p.family.includes("Acidic")) {
    synthBass.triggerAttackRelease("C2", "4n", undefined, vel, { pan, filter: cutoff });
  } else if (p.family && p.family.includes("Basic")) {
    synthLead.triggerAttackRelease([note, "G4"], "16n", undefined, vel, { pan, filter: cutoff });
  } else {
    // Hydrophobic / Polar
    synthPluck.triggerAttackRelease(note, "16n", undefined, vel, { pan, filter: cutoff });
  }

  // Update UI Card
  document.getElementById('residue-title').innerHTML = `🔬 ${p.name} (${d.char}) - Residue #${d.index + 1}`;
  document.getElementById('residue-stats').innerHTML = `
    <strong>Family:</strong> ${p.family} &nbsp;|&nbsp;
    <strong>Hydropathy:</strong> ${p.hydropathy} &nbsp;|&nbsp;
    <strong>Mass:</strong> ${p.mass} Da<br>
    <strong>Acoustic Mapping:</strong> Note ${note} • Cutoff ${Math.round(cutoff)}Hz • Pan ${pan.toFixed(2)}
  `;

  // Visual Choreography
  if (domElement) {
    choreography()
      .movement(currentMovement)
      .intensity(1.3)
      .duration(0.35)(domElement);

    d3.select(domElement).classed('active-hit', true);
    setTimeout(() => d3.select(domElement).classed('active-hit', false), 250);
  }
}

renderMolecule(currentMolKey);

// 4. Sequencing Playback Loop
let isPlaying = false;
let stepIndex = 0;
let playTimer = null;

async function stepSequence() {
  const mol = macromolecules[currentMolKey];
  const domNode = currentNodes.nodes()[stepIndex];
  const d = currentNodes.data()[stepIndex];

  sonifyResidue(d, domNode);

  stepIndex = (stepIndex + 1) % mol.seq.length;
}

const playBtn = document.getElementById('play-sequence-btn');
playBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isPlaying) {
    clearInterval(playTimer);
    isPlaying = false;
    playBtn.innerText = "▶ Fold & Sonify Macromolecule";
  } else {
    isPlaying = true;
    stepIndex = 0;
    playTimer = setInterval(stepSequence, stepInterval);
    playBtn.innerText = "⏸ Pause Molecular Folding";
  }
});

document.getElementById('molecule-select').addEventListener('change', (e) => {
  if (isPlaying) {
    clearInterval(playTimer);
    isPlaying = false;
    playBtn.innerText = "▶ Fold & Sonify Macromolecule";
  }
  currentMolKey = e.target.value;
  renderMolecule(currentMolKey);
});

document.getElementById('move-select').addEventListener('change', (e) => {
  currentMovement = e.target.value;
});

document.getElementById('speed-slider').addEventListener('input', (e) => {
  stepInterval = +e.target.value;
  document.getElementById('speed-display').innerText = stepInterval;
  if (isPlaying) {
    clearInterval(playTimer);
    playTimer = setInterval(stepSequence, stepInterval);
  }
});
