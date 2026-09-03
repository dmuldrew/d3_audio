import {
  scalePitch,
  scaleGain,
  scalePan,
  audioLegend,
  choreography,
  defaultEngine,
  createSynth,
  createSamplePlayer
} from '../../src/index.js';

const N = 40;
let array = [];
let isSorting = false;
let stepDelay = 35;
let currentAlgo = "quicksort";
let currentScale = "pentatonic";

let comparisons = 0;
let swaps = 0;

// Synthesizers
const synthChime = createSynth({ type: "pluckSynth", volume: -3 });
const synthWrite = createSynth({ type: "fmSynth", harmonicity: 2.0, volume: -4 });
const drums = createSamplePlayer();

// D3 Setup
const container = document.getElementById('sort-area');
const width = container.clientWidth || 700;
const height = container.clientHeight || 460;

const svg = d3.select(container)
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`);

const barWidth = (width - 20) / N;

const pitchScale = scalePitch()
  .domain([1, N])
  .range(["C3", "C6"])
  .scale(currentScale)
  .root("C");

const panScale = scalePan()
  .domain([0, N - 1])
  .range([-0.85, 0.85]);

// Interactive Audio Legend
const legend = audioLegend()
  .title("Sorting Memory ⬄ Audio Key")
  .pitch(pitchScale, "Array Element Value (1 ➔ 40)")
  .pan(panScale, "Memory Array Index (Left ↔ Right)")
  .sample(null, "Memory Swap / Write (Transient Click)");

d3.select("#legend-mount").call(legend);

function resetArray() {
  array = Array.from({ length: N }, (_, i) => i + 1);
  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  comparisons = 0;
  swaps = 0;
  updateStats();
  renderBars();
}

let barElements = [];

function renderBars() {
  svg.selectAll('*').remove();
  const maxVal = N;
  const yScale = d3.scaleLinear().domain([0, maxVal]).range([0, height - 20]);

  barElements = svg.selectAll('.sort-bar')
    .data(array)
    .enter()
    .append('rect')
    .attr('class', 'sort-bar')
    .attr('x', (d, i) => 10 + i * barWidth)
    .attr('y', d => height - yScale(d))
    .attr('width', barWidth - 2)
    .attr('height', d => yScale(d))
    .attr('fill', '#38bdf8')
    .attr('rx', 2);
}

function updateBar(idx, val, color) {
  const yScale = d3.scaleLinear().domain([0, N]).range([0, height - 20]);
  const b = barElements.nodes()[idx];
  if (b) {
    d3.select(b)
      .attr('y', height - yScale(val))
      .attr('height', yScale(val))
      .attr('fill', color || '#38bdf8');
  }
}

function updateStats() {
  document.getElementById('comp-count').innerText = comparisons;
  document.getElementById('swap-count').innerText = swaps;
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Sonify a comparison
function soundCompare(idx, val) {
  comparisons++;
  updateStats();
  const note = pitchScale(val);
  const pan = panScale(idx);
  synthChime.triggerAttackRelease(note, "32n", undefined, 0.6, { pan });
}

// Sonify a swap / memory write
function soundSwap(idx, val) {
  swaps++;
  updateStats();
  const note = pitchScale(val);
  const pan = panScale(idx);
  synthWrite.triggerAttackRelease(note, "32n", undefined, 0.7, { pan });
  drums.trigger("blip", "32n", undefined, 0.5, { pan });
}

// 1. Quicksort
async function quickSort(low, high) {
  if (low < high) {
    const pIdx = await partition(low, high);
    await quickSort(low, pIdx - 1);
    await quickSort(pIdx + 1, high);
  }
}

async function partition(low, high) {
  const pivot = array[high];
  updateBar(high, pivot, '#fbbf24');
  soundCompare(high, pivot);

  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (!isSorting) return;
    updateBar(j, array[j], '#f43f5e');
    soundCompare(j, array[j]);
    await sleep(stepDelay);

    if (array[j] < pivot) {
      i++;
      [array[i], array[j]] = [array[j], array[i]];
      updateBar(i, array[i], '#38bdf8');
      updateBar(j, array[j], '#38bdf8');
      soundSwap(i, array[i]);
    } else {
      updateBar(j, array[j], '#38bdf8');
    }
  }

  [array[i + 1], array[high]] = [array[high], array[i + 1]];
  updateBar(i + 1, array[i + 1], '#10b981');
  updateBar(high, array[high], '#38bdf8');
  soundSwap(i + 1, array[i + 1]);
  await sleep(stepDelay);

  return i + 1;
}

// 2. Bubble Sort
async function bubbleSort() {
  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < N - i - 1; j++) {
      if (!isSorting) return;
      updateBar(j, array[j], '#fbbf24');
      updateBar(j + 1, array[j + 1], '#fbbf24');
      soundCompare(j, array[j]);
      await sleep(stepDelay);

      if (array[j] > array[j + 1]) {
        [array[j], array[j + 1]] = [array[j + 1], array[j]];
        soundSwap(j, array[j]);
        updateBar(j, array[j], '#f43f5e');
        updateBar(j + 1, array[j + 1], '#f43f5e');
        await sleep(stepDelay / 2);
      }

      updateBar(j, array[j], '#38bdf8');
      updateBar(j + 1, array[j + 1], '#38bdf8');
    }
    updateBar(N - i - 1, array[N - i - 1], '#10b981');
  }
}

// 3. Insertion Sort
async function insertionSort() {
  for (let i = 1; i < N; i++) {
    let key = array[i];
    let j = i - 1;
    updateBar(i, key, '#fbbf24');
    soundCompare(i, key);

    while (j >= 0 && array[j] > key) {
      if (!isSorting) return;
      array[j + 1] = array[j];
      updateBar(j + 1, array[j + 1], '#f43f5e');
      soundSwap(j + 1, array[j + 1]);
      await sleep(stepDelay);
      updateBar(j + 1, array[j + 1], '#38bdf8');
      j--;
    }
    array[j + 1] = key;
    updateBar(j + 1, key, '#10b981');
    soundSwap(j + 1, key);
    await sleep(stepDelay);
  }
}

// 4. Mergesort
async function mergeSortHelper(l, r) {
  if (l >= r) return;
  const m = Math.floor((l + r) / 2);
  await mergeSortHelper(l, m);
  await mergeSortHelper(m + 1, r);
  await merge(l, m, r);
}

async function merge(l, m, r) {
  const left = array.slice(l, m + 1);
  const right = array.slice(m + 1, r + 1);
  let i = 0, j = 0, k = l;

  while (i < left.length && j < right.length) {
    if (!isSorting) return;
    soundCompare(k, left[i]);
    if (left[i] <= right[j]) {
      array[k] = left[i];
      i++;
    } else {
      array[k] = right[j];
      j++;
    }
    soundSwap(k, array[k]);
    updateBar(k, array[k], '#fbbf24');
    await sleep(stepDelay);
    updateBar(k, array[k], '#38bdf8');
    k++;
  }

  while (i < left.length) {
    if (!isSorting) return;
    array[k] = left[i];
    soundSwap(k, array[k]);
    updateBar(k, array[k], '#38bdf8');
    await sleep(stepDelay / 2);
    i++; k++;
  }

  while (j < right.length) {
    if (!isSorting) return;
    array[k] = right[j];
    soundSwap(k, array[k]);
    updateBar(k, array[k], '#38bdf8');
    await sleep(stepDelay / 2);
    j++; k++;
  }
}

// 5. Radix Sort LSD
async function radixSort() {
  const max = Math.max(...array);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    await countSortByDigit(exp);
  }
}

async function countSortByDigit(exp) {
  const output = new Array(N).fill(0);
  const count = new Array(10).fill(0);

  for (let i = 0; i < N; i++) {
    const digit = Math.floor(array[i] / exp) % 10;
    count[digit]++;
    soundCompare(i, array[i]);
    updateBar(i, array[i], '#fbbf24');
    await sleep(stepDelay / 2);
    updateBar(i, array[i], '#38bdf8');
  }

  for (let i = 1; i < 10; i++) count[i] += count[i - 1];

  for (let i = N - 1; i >= 0; i--) {
    if (!isSorting) return;
    const digit = Math.floor(array[i] / exp) % 10;
    output[count[digit] - 1] = array[i];
    count[digit]--;
  }

  for (let i = 0; i < N; i++) {
    if (!isSorting) return;
    array[i] = output[i];
    soundSwap(i, array[i]);
    updateBar(i, array[i], '#f43f5e');
    await sleep(stepDelay);
    updateBar(i, array[i], '#38bdf8');
  }
}

// Victory glissando sweep upon sort completion
async function victorySweep() {
  document.getElementById('sort-state').innerText = "✓ Sorted Successfully!";
  for (let i = 0; i < N; i++) {
    updateBar(i, array[i], '#10b981');
    const note = pitchScale(array[i]);
    const pan = panScale(i);
    synthChime.triggerAttackRelease(note, "32n", undefined, 0.8, { pan });
    await sleep(15);
  }
}

// Event Listeners
resetArray();

const runBtn = document.getElementById('run-sort-btn');
runBtn.addEventListener('click', async () => {
  await defaultEngine.start();
  if (isSorting) {
    isSorting = false;
    runBtn.innerText = "▶ Run Sorting Sonifier";
    document.getElementById('sort-state').innerText = "Paused";
    return;
  }

  isSorting = true;
  runBtn.innerText = "⏸ Pause Sort";
  document.getElementById('sort-state').innerText = "Sorting in Progress...";

  if (currentAlgo === 'quicksort') await quickSort(0, N - 1);
  else if (currentAlgo === 'bubble') await bubbleSort();
  else if (currentAlgo === 'insertion') await insertionSort();
  else if (currentAlgo === 'mergesort') await mergeSortHelper(0, N - 1);
  else if (currentAlgo === 'radix') await radixSort();

  if (isSorting) {
    await victorySweep();
  }

  isSorting = false;
  runBtn.innerText = "▶ Run Sorting Sonifier";
});

document.getElementById('shuffle-btn').addEventListener('click', () => {
  isSorting = false;
  runBtn.innerText = "▶ Run Sorting Sonifier";
  document.getElementById('sort-state').innerText = "Array Shuffled";
  resetArray();
});

document.getElementById('algo-select').addEventListener('change', (e) => {
  currentAlgo = e.target.value;
  const labels = {
    quicksort: "Quicksort (O(n log n))",
    mergesort: "Mergesort (O(n log n))",
    radix: "Radix Sort LSD (O(n·k))",
    bubble: "Bubble Sort (O(n²))",
    insertion: "Insertion Sort (O(n²))"
  };
  document.getElementById('sort-status').innerText = labels[currentAlgo];
});

document.getElementById('scale-select').addEventListener('change', (e) => {
  currentScale = e.target.value;
  pitchScale.scale(currentScale);
});

document.getElementById('delay-slider').addEventListener('input', (e) => {
  stepDelay = +e.target.value;
  document.getElementById('delay-val').innerText = stepDelay;
});
