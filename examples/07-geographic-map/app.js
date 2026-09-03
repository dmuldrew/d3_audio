import {
  scalePitch,
  scaleGain,
  scalePan,
  choreography,
  defaultEngine,
  createSynth
} from '/src/index.js';

// Global cities dataset
const cities = [
  { name: "San Francisco", lon: -122.4, lat: 37.8, pop: 8.8, continent: "NA" },
  { name: "New York", lon: -74.0, lat: 40.7, pop: 18.9, continent: "NA" },
  { name: "London", lon: -0.1, lat: 51.5, pop: 14.2, continent: "EU" },
  { name: "Paris", lon: 2.3, lat: 48.8, pop: 11.0, continent: "EU" },
  { name: "Cairo", lon: 31.2, lat: 30.0, pop: 20.9, continent: "AF" },
  { name: "Dubai", lon: 55.3, lat: 25.2, pop: 3.3, continent: "ME" },
  { name: "Mumbai", lon: 72.8, lat: 19.0, pop: 20.4, continent: "AS" },
  { name: "Singapore", lon: 103.8, lat: 1.3, pop: 5.7, continent: "AS" },
  { name: "Tokyo", lon: 139.7, lat: 35.7, pop: 37.4, continent: "AS" },
  { name: "Sydney", lon: 151.2, lat: -33.8, pop: 5.3, continent: "OC" },
  { name: "Santiago", lon: -70.6, lat: -33.4, pop: 6.8, continent: "SA" },
  { name: "São Paulo", lon: -46.6, lat: -23.5, pop: 21.8, continent: "SA" }
];

const container = document.getElementById('map-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 480;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

// D3 Geo Projection: Natural Earth 1 or Equirectangular
const projection = d3.geoNaturalEarth1()
  .scale(width / 5.4)
  .translate([width / 2, height / 2]);

const geoPath = d3.geoPath().projection(projection);

// Draw Map Graticules & Outlines
const graticule = d3.geoGraticule();
svg.append('path')
  .datum(graticule)
  .attr('d', geoPath)
  .attr('fill', 'none')
  .attr('stroke', 'rgba(255, 255, 255, 0.05)')
  .attr('stroke-width', 1);

// Generate smooth flight tour path connecting cities
const routeCoords = cities.map(c => [c.lon, c.lat]);
const flightCurve = d3.line()
  .x(d => projection(d)[0])
  .y(d => projection(d)[1])
  .curve(d3.curveCatmullRom.alpha(0.5));

const flightPath = svg.append('path')
  .datum(routeCoords)
  .attr('class', 'flight-path')
  .attr('d', flightCurve);

// Scales
let currentScale = 'pentatonic';
let currentMovement = 'bounce';

// Latitude (South -60 to North +70) -> Pitch (C3 to C6)
const pitchScale = scalePitch()
  .domain([-40, 60])
  .range(["C3", "C6"])
  .scale(currentScale)
  .root("C");

// Longitude (West -180 to East +180) -> Stereo Panning [-1.0, +1.0]
const panScale = scalePan()
  .domain([-180, 180])
  .range([-1.0, 1.0]);

const gainScale = scaleGain()
  .domain([3, 40])
  .range([0.45, 0.95]);

const synth = createSynth({ type: "polySynth", volume: -2 });

// Render City Pins
const cityGroup = svg.append('g');
const cityPins = cityGroup.selectAll('g')
  .data(cities)
  .enter()
  .append('g')
  .attr('class', 'city-pin')
  .attr('transform', d => {
    const [px, py] = projection([d.lon, d.lat]);
    return `translate(${px}, ${py})`;
  });

cityPins.append('circle')
  .attr('r', d => Math.max(5, Math.sqrt(d.pop) * 2.2))
  .attr('fill', '#38bdf8')
  .attr('stroke', '#ffffff')
  .attr('stroke-width', 1.5)
  .attr('opacity', 0.9);

cityPins.append('text')
  .attr('text-anchor', 'middle')
  .attr('dy', -12)
  .attr('fill', '#94a3b8')
  .attr('font-size', '10px')
  .attr('font-weight', '600')
  .text(d => d.name);

// Airplane Icon
const airplane = svg.append('polygon')
  .attr('class', 'airplane')
  .attr('points', '0,-8 6,8 0,4 -6,8')
  .attr('opacity', 0);

// Audition function
function sonifyCity(d, domElement) {
  const note = pitchScale(d.lat);
  const pan = panScale(d.lon);
  const vel = gainScale(d.pop);

  synth.triggerAttackRelease(note, "8n", undefined, vel, { pan });

  document.getElementById('map-status').innerText = `${d.name}: ${note} (Pan: ${pan > 0 ? '+' : ''}${pan.toFixed(2)})`;

  choreography()
    .movement(currentMovement)
    .intensity(1.4)
    .duration(0.4)(domElement);
}

cityPins.on('mouseenter click', async function(event, d) {
  await defaultEngine.start();
  sonifyCity(d, this);
});

// Flight Tour
let isFlying = false;
let flightIndex = 0;
let flightTimer = null;

async function stepFlight() {
  const city = cities[flightIndex];
  const domNode = cityPins.nodes()[flightIndex];
  const [px, py] = projection([city.lon, city.lat]);

  airplane
    .attr('opacity', 1)
    .attr('transform', `translate(${px}, ${py}) scale(1.4)`);

  sonifyCity(city, domNode);

  flightIndex = (flightIndex + 1) % cities.length;
}

const tourBtn = document.getElementById('flight-tour-btn');
tourBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isFlying) {
    clearInterval(flightTimer);
    isFlying = false;
    airplane.attr('opacity', 0);
    tourBtn.innerText = "✈ Start Flight Route Tour";
  } else {
    isFlying = true;
    const speed = +document.getElementById('flight-speed').value;
    flightTimer = setInterval(stepFlight, speed);
    tourBtn.innerText = "⏸ Stop Flight Tour";
  }
});

document.getElementById('flight-speed').addEventListener('input', (e) => {
  if (isFlying) {
    clearInterval(flightTimer);
    flightTimer = setInterval(stepFlight, +e.target.value);
  }
});

document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScale.scale(currentScale);
});

document.getElementById('move-select').addEventListener('change', (e) => {
  currentMovement = e.target.value;
});
