'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Kitsune-sensei — the tutor's face.
 *
 * A fox spirit rather than a human character, for two reasons. It sits at the
 * centre of Japanese folklore, so it earns its place in a Japanese-learning app
 * instead of being decoration; and a stylised animal face survives being drawn
 * in code, where a human one lands in the uncanny valley and reads as cheap.
 *
 * Every colour comes from the site palette — shu-iro vermilion, yamabuki gold,
 * sumi black, washi white — so the character belongs to the product rather than
 * looking like a sticker pasted onto it.
 *
 * Drawn rather than illustrated on purpose: a PNG per expression would be
 * hundreds of kilobytes and could not react to the stream, while this is a few
 * kilobytes of SVG whose ears, eyes and mouth are bound to the conversation
 * state. The mouth animates only while audio is actually playing, which is what
 * sells the character as speaking.
 */

export type SenseiMood =
  | 'idle'        // waiting
  | 'listening'   // microphone is open
  | 'thinking'    // model is generating
  | 'speaking'    // audio is playing
  | 'happy';      // praised the learner

interface Props {
  mood: SenseiMood;
  /** Two spirits: the day fox in vermilion, the night fox in gold. */
  variant?: 'madina' | 'sardor';
  size?: number;
  className?: string;
}

const PALETTE = {
  // Day fox — washi-white fur, shu-iro markings, yamabuki eyes.
  madina: {
    fur:      '#faf9f6',
    furShade: '#e6e1d8',
    mark:     '#e83929',
    markDeep: '#b82216',
    eye:      '#f2a900',
    collar:   '#1f1d1c',
    trim:     '#f2a900',
    halo:     '232,57,41',
  },
  // Night fox — sumi fur, yamabuki markings, shu-iro eyes.
  sardor: {
    fur:      '#2a2725',
    furShade: '#1a1817',
    mark:     '#f2a900',
    markDeep: '#c48200',
    eye:      '#e83929',
    collar:   '#faf9f6',
    trim:     '#e83929',
    halo:     '242,169,0',
  },
};

/** Halo opacity per state — colour stays the character's, only intensity moves. */
const MOOD_GLOW: Record<SenseiMood, number> = {
  idle:      0.22,
  listening: 0.7,
  thinking:  0.45,
  speaking:  0.55,
  happy:     0.6,
};

const MOOD_PULSE: Record<SenseiMood, number> = {
  idle: 3.2, listening: 1, thinking: 1.6, speaking: 1.2, happy: 1.4,
};

export function SenseiAvatar({ mood, variant = 'madina', size = 128, className }: Props) {
  const c = PALETTE[variant];
  const isSpeaking  = mood === 'speaking';
  const isListening = mood === 'listening';
  const eyesClosed  = mood === 'happy';
  const uid = variant;

  return (
    <div className={cn('relative select-none', className)} style={{ width: size, height: size }}>
      {/* Halo — one colour, intensity and speed carry the state */}
      <motion.div
        className="absolute inset-[8%] rounded-full"
        animate={{
          boxShadow: [
            `0 0 0 0 rgba(${c.halo},0)`,
            `0 0 ${size * 0.22}px ${size * 0.05}px rgba(${c.halo},${MOOD_GLOW[mood]})`,
            `0 0 0 0 rgba(${c.halo},0)`,
          ],
        }}
        transition={{ duration: MOOD_PULSE[mood], repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute inset-0"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: mood === 'happy' ? 1.2 : 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 140 140" width={size} height={size} aria-hidden="true">
          <defs>
            <linearGradient id={`fur-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.fur} />
              <stop offset="100%" stopColor={c.furShade} />
            </linearGradient>
          </defs>

          {/* ── Haori collar: the detail that turns an animal into a teacher ── */}
          <path d="M34 126 L70 104 L106 126 Z" fill={c.collar} />
          <path d="M52 126 L70 115 L88 126 Z" fill={c.trim} opacity="0.9" />

          {/* ── Ears ─────────────────────────────────────────────────────────
              They twitch forward while the microphone is open — the clearest
              signal at avatar size that the tutor is actually listening. */}
          <motion.g
            animate={{ rotate: isListening ? -7 : 0 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 220 }}
            style={{ originX: '38px', originY: '46px' }}
          >
            <path d="M24 56 L26 14 L58 36 Z" fill={`url(#fur-${uid})`} />
            <path d="M31 50 L32 25 L50 38 Z" fill={c.mark} />
          </motion.g>
          <motion.g
            animate={{ rotate: isListening ? 7 : 0 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 220 }}
            style={{ originX: '102px', originY: '46px' }}
          >
            <path d="M116 56 L114 14 L82 36 Z" fill={`url(#fur-${uid})`} />
            <path d="M109 50 L108 25 L90 38 Z" fill={c.mark} />
          </motion.g>

          {/* ── Head ─────────────────────────────────────────────────────────
              A fox muzzle, not a circle: wide cheeks tapering to a point. */}
          <path
            d="M70 30
               C 100 30, 118 46, 118 68
               C 118 88, 104 100, 88 106
               C 82 110, 76 113, 70 113
               C 64 113, 58 110, 52 106
               C 36 100, 22 88, 22 68
               C 22 46, 40 30, 70 30 Z"
            fill={`url(#fur-${uid})`}
          />

          {/* Kitsune-mask markings — the signature of the character */}
          <path d="M70 34 L76 46 L70 52 L64 46 Z" fill={c.mark} />
          <path d="M26 62 Q40 55 52 62 Q40 67 26 62 Z" fill={c.mark} opacity="0.85" />
          <path d="M114 62 Q100 55 88 62 Q100 67 114 62 Z" fill={c.mark} opacity="0.85" />
          <path d="M40 88 Q52 84 60 88" stroke={c.mark} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d="M100 88 Q88 84 80 88" stroke={c.mark} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />

          {/* ── Eyes ─────────────────────────────────────────────────────── */}
          {eyesClosed ? (
            <>
              <path d="M44 70 Q52 62 60 70" stroke={c.markDeep} strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M80 70 Q88 62 96 70" stroke={c.markDeep} strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : (
            [-1, 1].map((side) => {
              const cx = 70 + side * 18;
              return (
                <motion.g
                  key={side}
                  style={{ originX: `${cx}px`, originY: '70px' }}
                  animate={{ scaleY: [1, 1, 0.06, 1] }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                    repeatDelay: mood === 'thinking' ? 1.4 : 3.6,
                    times: [0, 0.72, 0.86, 1],
                  }}
                >
                  {/* Almond eye, tilted outward — the fox look */}
                  <path
                    d={`M${cx - 10} ${71 + side * -1}
                        Q${cx} ${61} ${cx + 10} ${71 + side * 1}
                        Q${cx} ${79} ${cx - 10} ${71 + side * -1} Z`}
                    fill={c.eye}
                  />
                  <ellipse cx={cx} cy="70.5" rx="3.2" ry="5.4" fill="#1a1414" />
                  <circle cx={cx - 2.5} cy="67.5" r="1.9" fill="#faf9f6" />
                  <circle cx={cx + 2.5} cy="73" r="0.9" fill="#faf9f6" opacity="0.75" />
                </motion.g>
              );
            })
          )}

          {/* Brows lift when puzzling something out */}
          <motion.g animate={{ y: mood === 'thinking' ? -3 : 0 }} transition={{ duration: 0.3 }}>
            <path d="M44 58 Q52 54 60 57" stroke={c.markDeep} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.55" />
            <path d="M96 58 Q88 54 80 57" stroke={c.markDeep} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.55" />
          </motion.g>

          {/* ── Muzzle ───────────────────────────────────────────────────── */}
          <path d="M58 92 Q70 88 82 92 Q78 106 70 108 Q62 106 58 92 Z" fill={c.fur} opacity={variant === 'madina' ? 0.9 : 0.16} />
          <path d="M70 96 L64 90 L76 90 Z" fill={c.markDeep} />

          {/* Mouth */}
          {isSpeaking ? (
            <motion.ellipse
              cx="70" cy="104" rx="5.5"
              fill={c.markDeep}
              animate={{ ry: [1.2, 5, 2.2, 5.5, 1.5] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : mood === 'happy' ? (
            <path d="M62 100 Q70 110 78 100" stroke={c.markDeep} strokeWidth="2.8" fill={c.markDeep} fillOpacity="0.3" strokeLinecap="round" />
          ) : isListening ? (
            <ellipse cx="70" cy="102" rx="3" ry="2.2" fill={c.markDeep} opacity="0.85" />
          ) : (
            <>
              <path d="M70 97 Q65 102 61 99" stroke={c.markDeep} strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M70 97 Q75 102 79 99" stroke={c.markDeep} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </>
          )}
        </svg>
      </motion.div>

      {/* Kitsune-bi — the foxfire that floats up while the model generates */}
      {mood === 'thinking' && (
        <div className="absolute -top-1 right-1 flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block rounded-full"
              style={{
                width: 6, height: 6,
                background: `rgb(${c.halo})`,
                boxShadow: `0 0 6px rgba(${c.halo},0.9)`,
              }}
              animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.16 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
