// Universal Audio Activation Helper for d3-audio Showcase & Examples
(function() {
  async function activateAudio() {
    try {
      if (window.Tone && typeof Tone.start === 'function') {
        await Tone.start();
      }
      if (window.Tone && Tone.context && Tone.context.state !== 'running') {
        await Tone.context.resume();
      }
      if (window.d3Audio && window.d3Audio.defaultEngine) {
        await window.d3Audio.defaultEngine.start();
      }
    } catch (err) {
      console.warn("Audio activation notice:", err);
    }
    updateButtons(true);
  }

  function updateButtons(isActive) {
    if (!isActive) return;
    const buttons = document.querySelectorAll('#btn-audio-activate, #enable-audio-btn, #nav-enable-audio-btn, .btn-enable-audio');
    buttons.forEach(btn => {
      btn.innerText = "✓ Audio Active 🔊";
      btn.style.background = "#10b981";
      btn.style.color = "#030712";
      btn.style.borderColor = "#10b981";
    });
  }

  function init() {
    const buttons = document.querySelectorAll('#btn-audio-activate, #enable-audio-btn, #nav-enable-audio-btn, .btn-enable-audio');
    buttons.forEach(btn => {
      btn.addEventListener('click', activateAudio);
    });

    // Check if Tone context is already running or transitions to running
    if (window.Tone && Tone.context) {
      if (Tone.context.state === 'running') {
        updateButtons(true);
      }
    }

    // Passive listener for any user interaction on page that starts audio
    document.addEventListener('click', () => {
      setTimeout(() => {
        if (window.Tone && Tone.context && Tone.context.state === 'running') {
          updateButtons(true);
        }
      }, 50);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
