// Universal Audio Activation Helper for d3-audio Showcase & Examples
// Fully optimized for iOS Safari / WebKit, hardware Silent Switch bypass, and desktop browsers.
(function() {
  const isIOS = typeof navigator !== 'undefined' && 
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  let isAudioUnlocked = false;

  // 1. iOS Hardware Silent Switch Bypass via inline HTML5 Audio tag
  // Elevates iOS WebKit AVAudioSession category from 'Ambient' to 'Playback'
  function playSilentAudioTag() {
    try {
      const audio = document.createElement('audio');
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audio.volume = 0.01;
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          setTimeout(() => {
            audio.pause();
            audio.remove();
          }, 80);
        }).catch(() => {});
      }
    } catch (e) {}
  }

  // 2. Synchronous Web Audio Buffer Unlocking
  // Runs immediately inside the user gesture event tick before any async microtask yields
  function unlockRawContext(ctx) {
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume();
      }
      if (typeof ctx.createBuffer === 'function') {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
    } catch (e) {}
  }

  async function activateAudio(event) {
    // Synchronous execution on the immediate user touch/click event
    playSilentAudioTag();

    const rawCtx = (window.Tone && Tone.context && Tone.context.rawContext) ||
      (window.d3Audio && window.d3Audio.defaultEngine && window.d3Audio.defaultEngine.getAudioContext()) ||
      (window.AudioContext && new (window.AudioContext || window.webkitAudioContext)());

    unlockRawContext(rawCtx);

    try {
      if (window.Tone && typeof Tone.start === 'function') {
        await Tone.start();
      }
      if (window.Tone && Tone.context && Tone.context.state !== 'running') {
        await Tone.context.resume();
      }
      if (window.Tone && Tone.context && isIOS) {
        if (Tone.context.lookAhead < 0.06) {
          Tone.context.lookAhead = 0.08;
        }
      }
      if (window.d3Audio && window.d3Audio.defaultEngine) {
        await window.d3Audio.defaultEngine.start();
      }
      isAudioUnlocked = true;
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

    const iosHint = document.getElementById('ios-audio-hint');
    if (iosHint) {
      iosHint.style.display = 'none';
    }
  }

  function init() {
    const buttons = document.querySelectorAll('#btn-audio-activate, #enable-audio-btn, #nav-enable-audio-btn, .btn-enable-audio');
    const userGestures = ['click', 'touchstart', 'touchend', 'pointerdown'];

    buttons.forEach(btn => {
      userGestures.forEach(ev => {
        btn.addEventListener(ev, activateAudio, { passive: false });
      });
    });

    // If on iOS, render a helpful hardware hint in the audio banner
    if (isIOS) {
      const bannerTop = document.querySelector('.audio-banner-top div');
      if (bannerTop && !document.getElementById('ios-audio-hint')) {
        const hint = document.createElement('p');
        hint.id = 'ios-audio-hint';
        hint.style.fontSize = '0.78rem';
        hint.style.color = '#f59e0b';
        hint.style.marginTop = '0.35rem';
        hint.innerHTML = '📱 <strong>iOS Tip:</strong> If no sound is heard, ensure your physical <strong>Silent/Mute switch</strong> is turned OFF and tap <strong>Enable Audio</strong>.';
        bannerTop.appendChild(hint);
      }
    }

    // Passive document-wide listeners for seamless activation on first tap anywhere
    const onDocTouch = () => {
      playSilentAudioTag();
      if (window.Tone && Tone.context && Tone.context.rawContext) {
        unlockRawContext(Tone.context.rawContext);
      }
      if (window.d3Audio && window.d3Audio.defaultEngine) {
        window.d3Audio.defaultEngine.start();
      }
      if (window.Tone && typeof Tone.start === 'function') {
        Tone.start().then(() => {
          if (Tone.context && Tone.context.state === 'running') {
            updateButtons(true);
          }
        });
      }
    };

    ['touchstart', 'touchend', 'click'].forEach(ev => {
      document.addEventListener(ev, onDocTouch, { passive: true });
    });

    // Check if Tone context is already running or transitions to running
    if (window.Tone && Tone.context) {
      if (Tone.context.state === 'running') {
        updateButtons(true);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
