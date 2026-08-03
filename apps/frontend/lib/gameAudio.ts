/**
 * Sound for the block-puzzle mode, synthesised with the Web Audio API.
 *
 * Deliberately no audio files: the whole soundtrack is a few oscillators, so
 * there is nothing to download, nothing to host, and it cannot block the game
 * from starting. Browsers refuse to start audio before a user gesture, so the
 * context is created lazily on the first play/`resume()` call.
 */

type Ctx = AudioContext & { __blocksMaster?: GainNode };

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;
let muted = false;

const MUTE_KEY = 'vocabjp:blocks:muted';

export const isMuted = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (muted) return true;
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};

export const setMuted = (value: boolean) => {
  muted = value;
  try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch { /* ignore */ }
  if (master && ctx) {
    master.gain.setTargetAtTime(value ? 0 : 0.9, ctx.currentTime, 0.05);
  }
  if (value) stopMusic();
};

/** True once audio has failed, so we stop retrying on every single sound. */
let audioBroken = false;

/**
 * Returns the shared AudioContext, creating it on first use.
 *
 * Everything here is best-effort: a browser that refuses to build an
 * AudioContext (autoplay policy, no output device, privacy mode) must not be
 * able to break the game, so failures are swallowed and audio simply stays off.
 */
const ensure = (): Ctx | null => {
  if (typeof window === 'undefined' || audioBroken) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) { audioBroken = true; return null; }
      ctx = new AC() as Ctx;
      master = ctx.createGain();
      master.gain.value = isMuted() ? 0 : 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    audioBroken = true;
    return null;
  }
};

/** Call from a click handler once, so later sounds are allowed to play. */
export const unlockAudio = () => { ensure(); };

interface ToneOptions {
  freq: number;
  /** Seconds. */
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  /** Seconds from now. */
  delay?: number;
  /** Slide to this frequency over the note's life. */
  slideTo?: number;
}

const tone = ({ freq, duration = 0.12, type = 'sine', gain = 0.2, delay = 0, slideTo }: ToneOptions) => {
  const c = ensure();
  if (!c || !master || isMuted()) return;

  try {
    const start = c.currentTime + delay;
    const osc = c.createOscillator();
    const env = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), start + duration);

    // Short attack, exponential tail — a plain gate would click audibly.
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(env);
    env.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    // A single failed note is never worth interrupting the game for.
  }
};

// ─── Effects ──────────────────────────────────────────────────────────────────

/** Picking a piece up. */
export const sfxPick = () => tone({ freq: 420, duration: 0.07, type: 'triangle', gain: 0.12 });

/** Dropping a piece onto the board. */
export const sfxPlace = () => {
  tone({ freq: 240, duration: 0.09, type: 'square', gain: 0.1 });
  tone({ freq: 360, duration: 0.07, type: 'triangle', gain: 0.08, delay: 0.03 });
};

/** Rejected placement. */
export const sfxDenied = () => tone({ freq: 150, duration: 0.14, type: 'sawtooth', gain: 0.09, slideTo: 90 });

/**
 * Line clear — a rising arpeggio that gets longer and brighter the more lines
 * went at once, so a four-line clear is audibly a bigger deal than a single.
 */
export const sfxClear = (lines: number) => {
  const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
  const notes = Math.min(2 + lines, scale.length);
  for (let i = 0; i < notes; i++) {
    tone({ freq: scale[i], duration: 0.16, type: 'triangle', gain: 0.16, delay: i * 0.055 });
  }
};

export const sfxCorrect = () => {
  tone({ freq: 587.33, duration: 0.11, type: 'triangle', gain: 0.16 });
  tone({ freq: 880, duration: 0.16, type: 'triangle', gain: 0.14, delay: 0.09 });
};

export const sfxWrong = () => {
  tone({ freq: 220, duration: 0.16, type: 'sawtooth', gain: 0.12 });
  tone({ freq: 165, duration: 0.22, type: 'sawtooth', gain: 0.1, delay: 0.1 });
};

export const sfxGameOver = () => {
  [440, 349.23, 293.66, 220].forEach((f, i) =>
    tone({ freq: f, duration: 0.3, type: 'triangle', gain: 0.16, delay: i * 0.16 }));
};

// ─── Background music ─────────────────────────────────────────────────────────

/**
 * A slow four-bar loop in A minor. Sparse on purpose — this plays under a game
 * that also wants the player reading vocabulary, so it stays out of the way.
 */
const BASS = [110, 110, 146.83, 130.81];
const PAD  = [
  [220, 261.63, 329.63],
  [220, 261.63, 329.63],
  [293.66, 349.23, 440],
  [261.63, 329.63, 392],
];

export const startMusic = () => {
  if (musicTimer || isMuted()) return;
  const c = ensure();
  if (!c) return;

  const beat = () => {
    if (isMuted()) return;
    const bar = musicStep % 4;

    tone({ freq: BASS[bar], duration: 0.5, type: 'sine', gain: 0.09 });
    if (musicStep % 2 === 0) {
      PAD[bar].forEach((f, i) =>
        tone({ freq: f, duration: 0.8, type: 'sine', gain: 0.035, delay: i * 0.02 }));
    }
    musicStep += 1;
  };

  beat();
  musicTimer = setInterval(beat, 900);
};

export const stopMusic = () => {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
};
