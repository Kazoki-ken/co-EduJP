/**
 * Scoring rules for the endless space-shooter mode.
 *
 * Kept as pure functions, separate from the canvas component, so the maths can
 * be reasoned about and tested without a browser — the rendering layer only
 * decides *when* a hit happened, never what it is worth.
 */

/** Base reward for destroying one planet. */
export const XP_PER_PLANET = 5;
/** Each consecutive hit adds this much to the multiplier… */
export const STREAK_STEP = 0.2;
/** …up to this ceiling. */
export const MAX_MULTIPLIER = 3;
/** Level 1 ends at 50 XP, level 2 at 100, level 3 at 150, and so on. */
export const XP_PER_LEVEL = 50;

export interface ArcadeState {
  /** The run score, and what the high score is measured against. */
  scoreXp: number;
  /** Drives levelling. Level-up bonuses deliberately do NOT feed this. */
  levelXp: number;
  level: number;
  /** Consecutive hits without a miss. */
  streak: number;
  bestStreak: number;
}

export const initialArcadeState = (): ArcadeState => ({
  scoreXp: 0,
  levelXp: 0,
  level: 1,
  streak: 0,
  bestStreak: 0,
});

/**
 * Multiplier earned by the *current* streak.
 *
 * The first hit of a run is worth 1x; each further hit in a row adds 0.2 until
 * it caps at 3x. A miss resets the streak, and with it the multiplier.
 */
export const multiplierFor = (streak: number): number =>
  Math.min(1 + STREAK_STEP * streak, MAX_MULTIPLIER);

/** XP a hit is worth, given how many hits preceded it without a miss. */
export const xpForHit = (streak: number): number =>
  Math.round(XP_PER_PLANET * multiplierFor(streak));

/** Level 1 covers 0–49 XP, level 2 covers 50–99, and so on. */
export const levelFromXp = (levelXp: number): number =>
  Math.floor(levelXp / XP_PER_LEVEL) + 1;

export interface HitOutcome {
  next: ArcadeState;
  /** XP the planet itself paid out. */
  gain: number;
  /** The new level if this hit crossed a threshold, otherwise null. */
  leveledUpTo: number | null;
  /** Flat bonus from detonating the rest of the screen on a level-up. */
  bonusXp: number;
}

/**
 * Applies a correct hit.
 *
 * On a level-up every planet still on screen detonates for a flat
 * XP_PER_PLANET each. That bonus is added to the score only — folding it back
 * into levelXp would let a single hit cascade through several levels at once.
 */
export const applyCorrect = (
  state: ArcadeState,
  planetsRemainingOnScreen: number,
): HitOutcome => {
  const gain = xpForHit(state.streak);
  const streak = state.streak + 1;
  const levelXp = state.levelXp + gain;
  const newLevel = levelFromXp(levelXp);
  const leveledUp = newLevel > state.level;
  const bonusXp = leveledUp ? planetsRemainingOnScreen * XP_PER_PLANET : 0;

  return {
    next: {
      scoreXp: state.scoreXp + gain + bonusXp,
      levelXp,
      level: leveledUp ? newLevel : state.level,
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
    },
    gain,
    leveledUpTo: leveledUp ? newLevel : null,
    bonusXp,
  };
};

/** Applies a miss: the streak (and multiplier) collapse, the score stands. */
export const applyWrong = (state: ArcadeState): ArcadeState => ({
  ...state,
  streak: 0,
});
