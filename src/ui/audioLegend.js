import { defaultEngine } from '../audio/soundEngine.js';
import { createSynth } from '../audio/synthVoice.js';
import { createSamplePlayer } from '../audio/samplePlayer.js';

/**
 * audioLegend: Interactive D3 Visual-Auditory Legend Widget.
 *
 * Implements the core principle of data sonification:
 * "Data + Known Mapping = Meaning. Communicate your data mapping to the user
 *  just like you would label a graph!"
 */
export function audioLegend() {
  const items = [];
  let title = "Audio-Visual Data Mapping Key";
  let synth = null;
  let samplePlayer = null;

  function ensureAudio() {
    if (!synth) synth = createSynth({ type: "polySynth", volume: -4 });
    if (!samplePlayer) samplePlayer = createSamplePlayer();
  }

  function legend(selection) {
    selection.each(function() {
      const container = this;
      container.innerHTML = '';
      container.classList.add('d3-audio-legend');

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(56, 189, 248, 0.25);
        border-radius: 10px;
        padding: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f8fafc;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      `;

      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        padding-bottom: 0.6rem;
        margin-bottom: 0.8rem;
      `;
      header.innerHTML = `
        <div style="font-weight: 700; font-size: 0.95rem; color: #38bdf8; display: flex; align-items: center; gap: 0.4rem;">
          <span>🎧</span>
          <span>${title}</span>
        </div>
        <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Click 🔊 to Audition</span>
      `;
      wrapper.appendChild(header);

      // List of mappings
      const list = document.createElement('div');
      list.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.75rem;
      `;

      items.forEach(item => {
        const card = document.createElement('div');
        card.style.cssText = `
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 0.65rem 0.8rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: border-color 0.2s, background 0.2s;
        `;
        card.onmouseenter = () => {
          card.style.borderColor = "rgba(56,189,248,0.5)";
          card.style.background = "rgba(56,189,248,0.05)";
        };
        card.onmouseleave = () => {
          card.style.borderColor = "rgba(255,255,255,0.06)";
          card.style.background = "rgba(255,255,255,0.03)";
        };

        const textPart = document.createElement('div');
        textPart.innerHTML = `
          <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">
            ${item.type} ⬄ ${item.dimension}
          </div>
          <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc; margin-top: 0.15rem;">
            ${item.dataLabel}
          </div>
          <div style="font-size: 0.72rem; color: #38bdf8; margin-top: 0.15rem;">
            ${item.rangeDesc}
          </div>
        `;

        const playBtn = document.createElement('button');
        playBtn.innerHTML = "🔊";
        playBtn.title = `Audition ${item.dataLabel} sonification`;
        playBtn.style.cssText = `
          background: #1e293b;
          color: #f8fafc;
          border: 1px solid rgba(56,189,248,0.3);
          border-radius: 6px;
          padding: 0.35rem 0.6rem;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        `;
        playBtn.onclick = async (e) => {
          e.stopPropagation();
          await defaultEngine.start();
          ensureAudio();
          playBtn.style.transform = "scale(0.92)";
          setTimeout(() => playBtn.style.transform = "scale(1)", 150);
          item.audition(synth, samplePlayer);
        };

        card.appendChild(textPart);
        card.appendChild(playBtn);
        list.appendChild(card);
      });

      wrapper.appendChild(list);
      container.appendChild(wrapper);
    });
  }

  legend.title = function(_) {
    if (!arguments.length) return title;
    title = _;
    return legend;
  };

  legend.pitch = function(scaler, dataLabel = "Metric") {
    items.push({
      type: "Pitch / Frequency",
      dimension: "Musical Notes",
      dataLabel,
      rangeDesc: `${scaler.domain ? scaler.domain().join(' → ') : ''} ⬄ ${scaler.range ? scaler.range().join(' → ') : ''}`,
      audition: async (s) => {
        const d = scaler.domain ? scaler.domain() : [0, 100];
        const n1 = scaler(d[0]);
        const n2 = scaler((d[0] + d[1]) / 2);
        const n3 = scaler(d[1]);
        s.triggerAttackRelease(n1, "16n");
        await new Promise(r => setTimeout(r, 160));
        s.triggerAttackRelease(n2, "16n");
        await new Promise(r => setTimeout(r, 160));
        s.triggerAttackRelease(n3, "8n");
      }
    });
    return legend;
  };

  legend.gain = function(scaler, dataLabel = "Volume") {
    items.push({
      type: "Gain / Amplitude",
      dimension: "Loudness",
      dataLabel,
      rangeDesc: `${scaler.domain ? scaler.domain().join(' → ') : ''} ⬄ Soft to Loud`,
      audition: async (s) => {
        s.triggerAttackRelease("C4", "16n", undefined, 0.2);
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("C4", "16n", undefined, 0.5);
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("C4", "8n", undefined, 0.95);
      }
    });
    return legend;
  };

  legend.pan = function(scaler, dataLabel = "Spatial Position") {
    items.push({
      type: "Stereo Panning",
      dimension: "Left ↔ Right Position",
      dataLabel,
      rangeDesc: `${scaler.domain ? scaler.domain().join(' → ') : ''} ⬄ L ↔ R`,
      audition: async (s) => {
        s.triggerAttackRelease("E4", "16n", undefined, 0.7, { pan: -0.85 });
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("G4", "16n", undefined, 0.7, { pan: 0.0 });
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("C5", "8n", undefined, 0.7, { pan: 0.85 });
      }
    });
    return legend;
  };

  legend.filter = function(scaler, dataLabel = "Filter Cutoff") {
    items.push({
      type: "Timbral Filter",
      dimension: "Cutoff Frequency (Hz)",
      dataLabel,
      rangeDesc: `${scaler.domain ? scaler.domain().join(' → ') : ''} ⬄ Dark to Bright`,
      audition: async (s) => {
        s.triggerAttackRelease("A3", "16n", undefined, 0.8, { filter: 400 });
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("A3", "16n", undefined, 0.8, { filter: 2000 });
        await new Promise(r => setTimeout(r, 220));
        s.triggerAttackRelease("A3", "8n", undefined, 0.8, { filter: 7000 });
      }
    });
    return legend;
  };

  legend.sample = function(scaler, dataLabel = "Category / Event Type") {
    items.push({
      type: "Categorical Timbre",
      dimension: "Percussion / Soundbank",
      dataLabel,
      rangeDesc: "Discrete categories mapped to distinct acoustic hits",
      audition: async (s, drums) => {
        drums.trigger("kick", "8n", undefined, 0.85);
        await new Promise(r => setTimeout(r, 200));
        drums.trigger("snare", "8n", undefined, 0.8);
        await new Promise(r => setTimeout(r, 200));
        drums.trigger("bell", "8n", undefined, 0.85);
      }
    });
    return legend;
  };

  legend.tension = function(scaler, dataLabel = "Harmonic Tension") {
    items.push({
      type: "Harmonic Tension",
      dimension: "Consonance ➔ Dissonance",
      dataLabel,
      rangeDesc: "Baseline Equilibrium ➔ Alert / Anomaly Spike",
      audition: async (s) => {
        // Consonant chord
        s.triggerAttackRelease(["C3", "G3", "C4", "E4"], "8n", undefined, 0.7);
        await new Promise(r => setTimeout(r, 380));
        // Dissonant tension chord
        s.triggerAttackRelease(["C3", "F#3", "Bb3", "Db4"], "8n", undefined, 0.85);
      }
    });
    return legend;
  };

  legend.clear = function() {
    items.length = 0;
    return legend;
  };

  return legend;
}
