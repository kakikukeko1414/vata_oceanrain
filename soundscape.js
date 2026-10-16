(() => {
  const preset = document.body.dataset.preset;
  let started = false;
  const timers = new Set();

  const rand = (a, b) => a + Math.random() * (b - a);

  function makeNoiseBuffer(context, seconds = 2) {
    const len = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, len, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function loopingNoise(context, destination, {
    gain = 0.03, type = "lowpass", frequency = 1200, q = 0.7
  } = {}) {
    const src = context.createBufferSource();
    src.buffer = makeNoiseBuffer(context, 3);
    src.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;

    const g = context.createGain();
    g.gain.value = gain;

    src.connect(filter).connect(g).connect(destination);
    src.start();
    return { src, filter, gain: g };
  }

  function createMaster(context) {
    const g = context.createGain();
    g.gain.value = 0.0001;

    const comp = context.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.35;

    g.connect(comp).connect(context.destination);
    return g;
  }

  function pulseTone(context, destination, {
    freq = 1800, duration = 0.12, gain = 0.02, type = "sine",
    attack = 0.01, release = 0.08
  } = {}) {
    const now = context.currentTime;
    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
    osc.connect(g).connect(destination);
    osc.start(now);
    osc.stop(now + duration + release + 0.05);
  }

  function schedule(fn, minMs, maxMs) {
    const tick = () => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
        tick();
      }, rand(minMs, maxMs));
      timers.add(id);
    };
    tick();
  }

  function buildOceanRain(context, out) {
    const ocean = loopingNoise(context, out, {
      gain: 0.075, type: "lowpass", frequency: 720, q: 0.5
    });
    const oceanLfo = context.createOscillator();
    const oceanLfoGain = context.createGain();
    oceanLfo.frequency.value = 0.085;
    oceanLfoGain.gain.value = 0.035;
    oceanLfo.connect(oceanLfoGain).connect(ocean.gain.gain);
    oceanLfo.start();

    loopingNoise(context, out, {
      gain: 0.025, type: "highpass", frequency: 2600, q: 0.4
    });
    loopingNoise(context, out, {
      gain: 0.018, type: "bandpass", frequency: 5200, q: 0.8
    });

    schedule(() => {
      pulseTone(context, out, {
        freq: rand(2200, 6000),
        duration: rand(0.018, 0.055),
        gain: rand(0.003, 0.012),
        type: "sine",
        attack: 0.002,
        release: rand(0.025, 0.08)
      });
    }, 70, 260);

    schedule(() => {
      const wave = loopingNoise(context, out, {
        gain: 0.0001, type: "lowpass", frequency: rand(450, 900), q: 0.6
      });
      const now = context.currentTime;
      wave.gain.gain.setValueAtTime(0.0001, now);
      wave.gain.gain.exponentialRampToValueAtTime(rand(0.07, 0.12), now + 1.2);
      wave.gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
      setTimeout(() => wave.src.stop(), 5200);
    }, 7000, 13000);
  }

  function buildNightForest(context, out) {
    const wind = loopingNoise(context, out, {
      gain: 0.027, type: "lowpass", frequency: 900, q: 0.45
    });
    const windLfo = context.createOscillator();
    const windDepth = context.createGain();
    windLfo.frequency.value = 0.045;
    windDepth.gain.value = 0.014;
    windLfo.connect(windDepth).connect(wind.gain.gain);
    windLfo.start();

    loopingNoise(context, out, {
      gain: 0.012, type: "bandpass", frequency: 3100, q: 0.6
    });

    schedule(() => {
      const base = rand(3600, 6200);
      const count = Math.floor(rand(2, 6));
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          pulseTone(context, out, {
            freq: base + rand(-100, 140),
            duration: rand(0.02, 0.05),
            gain: rand(0.004, 0.011),
            type: "square",
            attack: 0.002,
            release: 0.035
          });
        }, i * rand(55, 90));
      }
    }, 250, 900);

    schedule(() => {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(rand(480, 720), now);
      osc.frequency.exponentialRampToValueAtTime(rand(320, 470), now + 0.7);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.012, now + 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
      osc.connect(g).connect(out);
      osc.start();
      osc.stop(now + 1.1);
    }, 9000, 19000);
  }

  function buildMorningStream(context, out) {
    const stream = loopingNoise(context, out, {
      gain: 0.055, type: "bandpass", frequency: 1150, q: 0.42
    });

    loopingNoise(context, out, {
      gain: 0.022, type: "highpass", frequency: 3100, q: 0.35
    });

    const flowLfo = context.createOscillator();
    const flowDepth = context.createGain();
    flowLfo.frequency.value = 0.13;
    flowDepth.gain.value = 0.016;
    flowLfo.connect(flowDepth).connect(stream.gain.gain);
    flowLfo.start();

    schedule(() => {
      const base = rand(1800, 4200);
      const notes = Math.floor(rand(2, 5));
      for (let i = 0; i < notes; i++) {
        setTimeout(() => {
          const now = context.currentTime;
          const osc = context.createOscillator();
          const g = context.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(base * rand(0.92, 1.08), now);
          osc.frequency.exponentialRampToValueAtTime(base * rand(1.12, 1.38), now + 0.1);
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(rand(0.006, 0.014), now + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
          osc.connect(g).connect(out);
          osc.start();
          osc.stop(now + 0.22);
        }, i * rand(110, 210));
      }
    }, 2600, 6800);
  }

  async function start() {
    if (started) return;
    started = true;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    const master = createMaster(ctx);

    if (preset === "ocean-rain") buildOceanRain(ctx, master);
    if (preset === "night-forest") buildNightForest(ctx, master);
    if (preset === "morning-stream") buildMorningStream(ctx, master);

    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.9, now + 2.4);
  }

  document.addEventListener("pointerdown", start, { once: true });
  document.addEventListener("keydown", start, { once: true });
})();
