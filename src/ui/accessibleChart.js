import { scalePitch } from '../scales/scalePitch.js';
import { createSynth } from '../audio/synthVoice.js';
import { defaultEngine } from '../audio/soundEngine.js';

/**
 * accessibleChart: Turnkey D3 component for universal accessibility (a11y) sonification.
 * Enables blind and low-vision users to explore any D3 visualization via keyboard navigation,
 * real-time ARIA live speech announcements, and synchronized auditory earcons.
 *
 * Keyboard Shortcuts:
 * - ArrowRight: Move to next data point
 * - ArrowLeft: Move to previous data point
 * - Home: Jump to first data point
 * - End: Jump to last data point
 * - Spacebar: Play / Pause continuous chart sonification
 */
export function accessibleChart(options = {}) {
  const data = options.data || [];
  const getX = options.x || ((d, i) => d.x !== undefined ? d.x : i);
  const getY = options.y || ((d) => d.y !== undefined ? d.y : (typeof d === 'number' ? d : 0));
  const getLabel = options.label || ((d, i, total) => `Point ${i + 1} of ${total}: ${getX(d, i)}, Value ${getY(d)}`);
  const onPoint = options.onPoint || null;

  let synth = options.synth || null;
  let pitchScale = options.pitchScale || null;
  let currentIndex = 0;
  let isPlaying = false;
  let playInterval = null;

  // Compute min/max for pitch scale and earcons
  const yValues = data.map(d => getY(d)).filter(v => !isNaN(v));
  const minY = yValues.length ? Math.min(...yValues) : 0;
  const maxY = yValues.length ? Math.max(...yValues) : 100;

  if (!pitchScale) {
    pitchScale = scalePitch().domain([minY, maxY]).range(["C3", "C6"]).scale("pentatonic");
  }

  function chart(selection) {
    selection.each(function() {
      const node = this;
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'application');
      node.setAttribute('aria-roledescription', 'Sonified Data Visualization');
      node.setAttribute('aria-label', options.title || 'Interactive Accessible Data Chart. Use left and right arrow keys to explore points, spacebar to play.');

      // Inject ARIA Live Region for screen readers
      let liveRegion = node.querySelector('.d3-audio-sr-live');
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.className = 'd3-audio-sr-live';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.padding = '0';
        liveRegion.style.margin = '-1px';
        liveRegion.style.overflow = 'hidden';
        liveRegion.style.clip = 'rect(0, 0, 0, 0)';
        liveRegion.style.whiteSpace = 'nowrap';
        liveRegion.style.border = '0';
        node.appendChild(liveRegion);
      }

      function ensureSynth() {
        if (!synth) {
          synth = createSynth({ type: "polySynth", volume: -2 });
        }
      }

      function sonifyIndex(idx) {
        if (!data || data.length === 0) return;
        idx = Math.max(0, Math.min(data.length - 1, idx));
        currentIndex = idx;

        ensureSynth();
        defaultEngine.start();

        const item = data[idx];
        const val = getY(item);
        const note = pitchScale(val);

        // Special earcon cues
        if (val === maxY && val !== minY) {
          // Max peak earcon: rapid two-note ascending chime
          synth.triggerAttackRelease(note, "16n", undefined, 0.9);
        } else if (val === minY && val !== maxY) {
          // Min low earcon: low percussive note
          synth.triggerAttackRelease(note, "8n", undefined, 0.85);
        } else {
          synth.triggerAttackRelease(note, "16n", undefined, 0.75);
        }

        // Screen reader announcement
        const announcement = getLabel(item, idx, data.length);
        if (liveRegion) {
          liveRegion.innerText = announcement;
        }

        if (typeof onPoint === 'function') {
          onPoint(item, idx, note);
        }
      }

      function togglePlay() {
        if (isPlaying) {
          clearInterval(playInterval);
          isPlaying = false;
          if (liveRegion) liveRegion.innerText = "Chart sonification paused.";
        } else {
          isPlaying = true;
          if (currentIndex >= data.length - 1) currentIndex = 0;
          playInterval = setInterval(() => {
            sonifyIndex(currentIndex);
            currentIndex++;
            if (currentIndex >= data.length) {
              clearInterval(playInterval);
              isPlaying = false;
              if (liveRegion) liveRegion.innerText = "End of chart data.";
            }
          }, options.interval || 250);
        }
      }

      // Keyboard Event Listener
      node.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          sonifyIndex(currentIndex + 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          sonifyIndex(currentIndex - 1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          sonifyIndex(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          sonifyIndex(data.length - 1);
        } else if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          togglePlay();
        }
      });
    });
  }

  chart.data = function(d) {
    return arguments.length ? ((options.data = d), chart) : data;
  };

  chart.index = function(i) {
    return arguments.length ? ((currentIndex = i), chart) : currentIndex;
  };

  return chart;
}
