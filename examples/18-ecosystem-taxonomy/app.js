import {
  scalePitch,
  scaleGain,
  scalePan,
  scaleTension,
  audioLegend,
  choreography,
  defaultEngine,
  createSynth,
  createSamplePlayer
} from '../../src/index.js';

// Ecosystem Taxonomy Datasets
const biomeData = {
  rainforest: {
    name: "Tropical Rainforest Canopy",
    mode: "dorian",
    root: "D",
    species: [
      { id: "fig", name: "Strangler Fig Tree", tier: 0, category: "Producer", iucn: 0, emoji: "🌳", x: 120, y: 390 },
      { id: "orchid", name: "Canopy Epiphyte Orchid", tier: 0, category: "Producer", iucn: 1, emoji: "🌸", x: 260, y: 400 },
      { id: "bamboo", name: "Giant River Bamboo", tier: 0, category: "Producer", iucn: 0, emoji: "🎋", x: 420, y: 395 },

      { id: "monkey", name: "Howler Monkey", tier: 1, category: "Herbivore", iucn: 1, emoji: "🐒", x: 150, y: 290 },
      { id: "toucan", name: "Toco Toucan", tier: 1, category: "Herbivore", iucn: 0, emoji: "🦜", x: 300, y: 280 },
      { id: "sloth", name: "Three-Toed Sloth", tier: 1, category: "Herbivore", iucn: 2, emoji: "🦥", x: 440, y: 295 },

      { id: "frog", name: "Poison Dart Frog", tier: 2, category: "Carnivore", iucn: 3, emoji: "🐸", x: 200, y: 180 },
      { id: "eagle", name: "Harpy Eagle", tier: 2, category: "Carnivore", iucn: 3, emoji: "🦅", x: 370, y: 175 },

      { id: "jaguar", name: "Amazonian Jaguar", tier: 3, category: "Apex", iucn: 3, emoji: "🐆", x: 285, y: 70 },

      { id: "fungus", name: "Luminescent Bracket Fungi", tier: 4, category: "Decomposer", iucn: 0, emoji: "🍄", x: 550, y: 380 }
    ],
    links: [
      ["fig", "monkey"], ["fig", "toucan"], ["orchid", "sloth"], ["bamboo", "sloth"],
      ["monkey", "jaguar"], ["toucan", "eagle"], ["sloth", "jaguar"],
      ["frog", "eagle"], ["eagle", "jaguar"], ["jaguar", "fungus"], ["sloth", "fungus"]
    ]
  },
  ocean: {
    name: "Pelagic Coral Reef & Open Ocean",
    mode: "lydian",
    root: "F",
    species: [
      { id: "phyto", name: "Phytoplankton Bloom", tier: 0, category: "Producer", iucn: 0, emoji: "🦠", x: 130, y: 390 },
      { id: "kelp", name: "Giant Kelp Forest", tier: 0, category: "Producer", iucn: 1, emoji: "🌿", x: 300, y: 400 },
      { id: "coral", name: "Staghorn Coral Colony", tier: 0, category: "Producer", iucn: 4, emoji: "🪸", x: 450, y: 395 },

      { id: "krill", name: "Euphausiid Krill Swarm", tier: 1, category: "Herbivore", iucn: 0, emoji: "🦐", x: 160, y: 290 },
      { id: "turtle", name: "Hawksbill Sea Turtle", tier: 1, category: "Herbivore", iucn: 4, emoji: "🐢", x: 380, y: 285 },

      { id: "tuna", name: "Bluefin Tuna", tier: 2, category: "Carnivore", iucn: 3, emoji: "🐟", x: 230, y: 180 },
      { id: "octopus", name: "Mimic Octopus", tier: 2, category: "Carnivore", iucn: 1, emoji: "🐙", x: 410, y: 175 },

      { id: "orca", name: "Transient Orca Pod", tier: 3, category: "Apex", iucn: 2, emoji: "🐋", x: 290, y: 70 },

      { id: "worm", name: "Benthic Abyssal Worms", tier: 4, category: "Decomposer", iucn: 0, emoji: "🪱", x: 550, y: 380 }
    ],
    links: [
      ["phyto", "krill"], ["kelp", "turtle"], ["coral", "turtle"],
      ["krill", "tuna"], ["tuna", "orca"], ["turtle", "orca"], ["octopus", "tuna"],
      ["orca", "worm"], ["tuna", "worm"]
    ]
  },
  savanna: {
    name: "East African Savanna & Grasslands",
    mode: "pentatonic",
    root: "C",
    species: [
      { id: "grass", name: "Red Oat Grass", tier: 0, category: "Producer", iucn: 0, emoji: "🌾", x: 140, y: 390 },
      { id: "acacia", name: "Umbrella Thorn Acacia", tier: 0, category: "Producer", iucn: 0, emoji: "🌳", x: 320, y: 400 },
      { id: "baobab", name: "Grand Baobab", tier: 0, category: "Producer", iucn: 2, emoji: "🪵", x: 460, y: 395 },

      { id: "zebra", name: "Plains Zebra", tier: 1, category: "Herbivore", iucn: 1, emoji: "🦓", x: 180, y: 290 },
      { id: "giraffe", name: "Masai Giraffe", tier: 1, category: "Herbivore", iucn: 3, emoji: "🦒", x: 390, y: 285 },

      { id: "cheetah", name: "Savanna Cheetah", tier: 2, category: "Carnivore", iucn: 2, emoji: "🐆", x: 220, y: 180 },
      { id: "hyena", name: "Spotted Hyena", tier: 2, category: "Carnivore", iucn: 0, emoji: "🐕", x: 410, y: 175 },

      { id: "lion", name: "African Lion Pride", tier: 3, category: "Apex", iucn: 2, emoji: "🦁", x: 290, y: 70 },

      { id: "beetle", name: "Scarabaeus Dung Beetle", tier: 4, category: "Decomposer", iucn: 0, emoji: "🪲", x: 550, y: 380 }
    ],
    links: [
      ["grass", "zebra"], ["acacia", "giraffe"], ["baobab", "giraffe"],
      ["zebra", "cheetah"], ["zebra", "lion"], ["giraffe", "lion"],
      ["cheetah", "hyena"], ["hyena", "lion"], ["lion", "beetle"], ["zebra", "beetle"]
    ]
  },
  arctic: {
    name: "High Arctic Tundra & Sea Ice",
    mode: "hirajoshi",
    root: "E",
    species: [
      { id: "lichen", name: "Reindeer Lichen", tier: 0, category: "Producer", iucn: 0, emoji: "🌱", x: 150, y: 390 },
      { id: "willow", name: "Arctic Willow Shrub", tier: 0, category: "Producer", iucn: 0, emoji: "🌿", x: 380, y: 400 },

      { id: "caribou", name: "Migratory Barren-ground Caribou", tier: 1, category: "Herbivore", iucn: 3, emoji: "🦌", x: 200, y: 290 },
      { id: "hare", name: "Arctic Snowshoe Hare", tier: 1, category: "Herbivore", iucn: 0, emoji: "🐇", x: 390, y: 285 },

      { id: "fox", name: "Arctic White Fox", tier: 2, category: "Carnivore", iucn: 0, emoji: "🦊", x: 230, y: 180 },
      { id: "seal", name: "Ringed Ice Seal", tier: 2, category: "Carnivore", iucn: 2, emoji: "🦭", x: 410, y: 175 },

      { id: "bear", name: "Polar Bear (Ursus maritimus)", tier: 3, category: "Apex", iucn: 3, emoji: "🐻‍❄️", x: 300, y: 70 },

      { id: "bacteria", name: "Permafrost Psychrophilic Microbiome", tier: 4, category: "Decomposer", iucn: 0, emoji: "🧫", x: 550, y: 380 }
    ],
    links: [
      ["lichen", "caribou"], ["willow", "hare"],
      ["hare", "fox"], ["caribou", "bear"], ["seal", "bear"],
      ["fox", "bear"], ["bear", "bacteria"], ["seal", "bacteria"]
    ]
  }
};

const iucnLabels = ["Least Concern (LC)", "Near Threatened (NT)", "Vulnerable (VU)", "Endangered (EN)", "Critically Endangered (CR)"];

const container = document.getElementById('ecosystem-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 480;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const g = svg.append('g');

// Synthesizers
const synthProducer = createSynth({ type: "polySynth", volume: -4 });
const synthHerbivore = createSynth({ type: "pluckSynth", volume: -2 });
const synthCarnivore = createSynth({ type: "fmSynth", harmonicity: 3.0, volume: -3 });
const synthApex = createSynth({ type: "polySynth", volume: -1 });
const drums = createSamplePlayer();

// Tension Scaler for IUCN Risk
const tensionScaler = scaleTension().domain([0, 4]);

// Pitch & Pan Scalers
let currentBiomeKey = "rainforest";
let pitchScale = scalePitch().domain([0, 4]).range(["C3", "C5"]).scale("dorian").root("D");
const panScale = scalePan().domain([50, 600]).range([-0.8, 0.8]);

// Mount Interactive Audio Legend
const legend = audioLegend()
  .title("Categorical Taxonomy ⬄ Timbre Mapping Key")
  .pitch(pitchScale, "Trophic Tier Level (Producers ➔ Apex)")
  .sample(null, "Decomposers (Granular Percussion Hits)")
  .tension(tensionScaler, "Conservation Status Risk (LC ➔ Critically Endangered)");

d3.select("#legend-mount").call(legend);

// Draw Canvas
let currentSpeciesNodes = [];
let currentLinkLines = [];

function renderBiome(biomeKey) {
  g.selectAll('*').remove();
  const biome = biomeData[biomeKey];
  document.getElementById('biome-status').innerText = biome.name;

  pitchScale.scale(biome.mode).root(biome.root);

  // Draw Trophic Tier Guidelines
  const tiers = [
    { y: 70, label: "Tier 3: Apex Predators" },
    { y: 175, label: "Tier 2: Secondary Carnivores" },
    { y: 285, label: "Tier 1: Primary Herbivores" },
    { y: 395, label: "Tier 0: Primary Producers" }
  ];

  tiers.forEach(t => {
    g.append('line')
      .attr('x1', 40).attr('x2', width - 40)
      .attr('y1', t.y).attr('y2', t.y)
      .attr('class', 'trophic-tier');

    g.append('text')
      .attr('x', 45)
      .attr('y', t.y - 6)
      .attr('fill', '#475569')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text(t.label);
  });

  // Food Web Links
  const speciesMap = new Map(biome.species.map(s => [s.id, s]));
  const linkData = biome.links.map(l => ({ source: speciesMap.get(l[0]), target: speciesMap.get(l[1]) })).filter(d => d.source && d.target);

  currentLinkLines = g.selectAll('.food-link')
    .data(linkData)
    .enter()
    .append('line')
    .attr('class', 'food-link')
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);

  // Species Nodes
  currentSpeciesNodes = g.selectAll('.species-node')
    .data(biome.species)
    .enter()
    .append('g')
    .attr('class', 'species-node')
    .attr('transform', d => `translate(${d.x}, ${d.y})`);

  // Node halo colored by trophic category
  const categoryColors = {
    Producer: "#10b981",
    Herbivore: "#38bdf8",
    Carnivore: "#f59e0b",
    Apex: "#f43f5e",
    Decomposer: "#a855f7"
  };

  currentSpeciesNodes.append('circle')
    .attr('r', d => d.category === 'Apex' ? 22 : 17)
    .attr('fill', '#0b1322')
    .attr('stroke', d => categoryColors[d.category])
    .attr('stroke-width', 2);

  currentSpeciesNodes.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em')
    .attr('font-size', d => d.category === 'Apex' ? '16px' : '14px')
    .text(d => d.emoji);

  currentSpeciesNodes.on('mouseenter click', async function(event, d) {
    await defaultEngine.start();
    sonifySpecies(d, this);
  });
}

// Categorical Sonification Engine
function sonifySpecies(d, domNode) {
  const pan = panScale(d.x);
  const tInfo = tensionScaler(d.iucn);

  // Categorical Instrument Timbre Routing
  if (d.category === "Decomposer") {
    drums.trigger("blip", "16n", undefined, 0.85, { pan });
  } else if (d.category === "Producer") {
    synthProducer.triggerAttackRelease(["C3", "G3"], "4n", undefined, 0.5, { pan });
  } else if (d.category === "Herbivore") {
    synthHerbivore.triggerAttackRelease(pitchScale(1), "16n", undefined, 0.7, { pan });
  } else if (d.category === "Carnivore") {
    synthCarnivore.triggerAttackRelease(pitchScale(2), "8n", undefined, 0.8, { pan });
  } else if (d.category === "Apex") {
    // If endangered, sound tense chords!
    if (tInfo.isDissonant) {
      synthApex.triggerAttackRelease(tInfo.chord, "4n", undefined, 0.95, { pan });
    } else {
      synthApex.triggerAttackRelease(["C2", "G2", "C3"], "4n", undefined, 0.9, { pan });
    }
  }

  // Update UI Card
  document.getElementById('species-title').innerHTML = `${d.emoji} ${d.name}`;
  document.getElementById('species-stats').innerHTML = `
    <strong>Category:</strong> ${d.category} (Tier ${d.tier})<br>
    <strong>IUCN Red List:</strong> <span style="color: ${d.iucn >= 3 ? '#f43f5e' : (d.iucn >= 2 ? '#fbbf24' : '#10b981')}">${iucnLabels[d.iucn]}</span><br>
    <strong>Harmonic Tension:</strong> ${tInfo.tier.toUpperCase()} (${tInfo.isDissonant ? 'Dissonant Tritone Shock' : 'Consonant Equilibrium'})
  `;

  // Visual Choreography
  if (domNode) {
    choreography()
      .movement(d.iucn >= 3 ? "shake" : "pulse")
      .intensity(1.3)
      .duration(0.3)(domNode);

    d3.select(domNode).classed('active-pulse', true);
    setTimeout(() => d3.select(domNode).classed('active-pulse', false), 250);
  }
}

renderBiome(currentBiomeKey);

// Food Web Cascade Sequence
let isCascading = false;
let cascadeTimer = null;
let cascadeIndex = 0;

async function stepCascade() {
  const biome = biomeData[currentBiomeKey];
  const sorted = [...biome.species].sort((a, b) => a.tier - b.tier);
  const current = sorted[cascadeIndex];
  const domNode = currentSpeciesNodes.filter(d => d.id === current.id).node();

  sonifySpecies(current, domNode);

  cascadeIndex = (cascadeIndex + 1) % sorted.length;
}

const cascadeBtn = document.getElementById('play-cascade-btn');
cascadeBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isCascading) {
    clearInterval(cascadeTimer);
    isCascading = false;
    cascadeBtn.innerText = "▶ Run Trophic Food Cascade";
  } else {
    isCascading = true;
    cascadeIndex = 0;
    cascadeTimer = setInterval(stepCascade, 220);
    cascadeBtn.innerText = "⏸ Pause Trophic Cascade";
  }
});

document.getElementById('biome-select').addEventListener('change', (e) => {
  if (isCascading) {
    clearInterval(cascadeTimer);
    isCascading = false;
    cascadeBtn.innerText = "▶ Run Trophic Food Cascade";
  }
  currentBiomeKey = e.target.value;
  renderBiome(currentBiomeKey);
});

document.getElementById('status-filter').addEventListener('change', (e) => {
  const val = e.target.value;
  currentSpeciesNodes.attr('opacity', d => {
    if (val === 'threatened') return d.iucn >= 2 ? 1 : 0.2;
    if (val === 'leastConcern') return d.iucn < 2 ? 1 : 0.2;
    return 1;
  });
});
