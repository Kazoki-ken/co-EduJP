/**
 * Rules for the block-puzzle mode.
 *
 * Pure functions only — no React, no canvas — so the board maths can be tested
 * directly. The component decides *when* something happens; this file decides
 * whether it is legal and what it is worth.
 */

export const GRID = 8;

/** A piece is a list of filled cells, normalised so the top-left is (0,0). */
export interface Shape {
  id: string;
  cells: { r: number; c: number }[];
  /** Index into SHAPE_COLORS, kept on the piece so it stays stable while dragged. */
  color: number;
}

export type Grid = (number | null)[][];

export const SHAPE_COLORS = [
  '#e83929', // vermilion
  '#f2a900', // gold
  '#2d7a47', // matcha
  '#3b82f6', // sky
  '#a855f7', // violet
  '#ec4899', // pink
] as const;

// ─── Shape catalogue ──────────────────────────────────────────────────────────

const cell = (r: number, c: number) => ({ r, c });

/**
 * The Block Blast staples: single, lines up to 5, squares, L/T/S/Z tetrominoes
 * and the little corner pieces. Kept deliberately small so an 8×8 board stays
 * solvable for a while.
 */
const SHAPE_PATTERNS: { r: number; c: number }[][] = [
  // dot
  [cell(0, 0)],
  // lines — horizontal
  [cell(0, 0), cell(0, 1)],
  [cell(0, 0), cell(0, 1), cell(0, 2)],
  [cell(0, 0), cell(0, 1), cell(0, 2), cell(0, 3)],
  [cell(0, 0), cell(0, 1), cell(0, 2), cell(0, 3), cell(0, 4)],
  // lines — vertical
  [cell(0, 0), cell(1, 0)],
  [cell(0, 0), cell(1, 0), cell(2, 0)],
  [cell(0, 0), cell(1, 0), cell(2, 0), cell(3, 0)],
  [cell(0, 0), cell(1, 0), cell(2, 0), cell(3, 0), cell(4, 0)],
  // squares
  [cell(0, 0), cell(0, 1), cell(1, 0), cell(1, 1)],
  [cell(0, 0), cell(0, 1), cell(0, 2), cell(1, 0), cell(1, 1), cell(1, 2),
   cell(2, 0), cell(2, 1), cell(2, 2)],
  // corners (all four rotations)
  [cell(0, 0), cell(1, 0), cell(1, 1)],
  [cell(0, 0), cell(0, 1), cell(1, 0)],
  [cell(0, 0), cell(0, 1), cell(1, 1)],
  [cell(0, 1), cell(1, 0), cell(1, 1)],
  // L / J
  [cell(0, 0), cell(1, 0), cell(2, 0), cell(2, 1)],
  [cell(0, 1), cell(1, 1), cell(2, 1), cell(2, 0)],
  [cell(0, 0), cell(0, 1), cell(0, 2), cell(1, 0)],
  [cell(0, 0), cell(0, 1), cell(0, 2), cell(1, 2)],
  // T
  [cell(0, 0), cell(0, 1), cell(0, 2), cell(1, 1)],
  [cell(0, 1), cell(1, 0), cell(1, 1), cell(1, 2)],
  // S / Z
  [cell(0, 1), cell(0, 2), cell(1, 0), cell(1, 1)],
  [cell(0, 0), cell(0, 1), cell(1, 1), cell(1, 2)],
];

export const emptyGrid = (): Grid =>
  Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => null));

export const shapeSize = (shape: Shape) => {
  const rows = Math.max(...shape.cells.map((c) => c.r)) + 1;
  const cols = Math.max(...shape.cells.map((c) => c.c)) + 1;
  return { rows, cols };
};

let shapeCounter = 0;
const nextShapeId = () => `s${++shapeCounter}-${Math.random().toString(36).slice(2, 7)}`;

export const randomShape = (): Shape => ({
  id: nextShapeId(),
  cells: SHAPE_PATTERNS[Math.floor(Math.random() * SHAPE_PATTERNS.length)],
  color: Math.floor(Math.random() * SHAPE_COLORS.length),
});

export const randomTray = (count = 3): Shape[] =>
  Array.from({ length: count }, randomShape);

// ─── Placement ────────────────────────────────────────────────────────────────

/** Whether `shape` fits with its top-left anchored at (row, col). */
export const canPlace = (grid: Grid, shape: Shape, row: number, col: number): boolean => {
  for (const c of shape.cells) {
    const r = row + c.r, cc = col + c.c;
    if (r < 0 || r >= GRID || cc < 0 || cc >= GRID) return false;
    if (grid[r][cc] !== null) return false;
  }
  return true;
};

/** Whether the shape fits anywhere at all — used for game-over detection. */
export const fitsAnywhere = (grid: Grid, shape: Shape): boolean => {
  const { rows, cols } = shapeSize(shape);
  for (let r = 0; r <= GRID - rows; r++) {
    for (let c = 0; c <= GRID - cols; c++) {
      if (canPlace(grid, shape, r, c)) return true;
    }
  }
  return false;
};

/** True when none of the remaining pieces can be placed. */
export const isGameOver = (grid: Grid, tray: Shape[]): boolean =>
  tray.length > 0 && tray.every((s) => !fitsAnywhere(grid, s));

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Points for a single filled cell. */
export const POINTS_PER_CELL = 1;
/** Points for the first line of a clear; further lines escalate. */
export const POINTS_PER_LINE = 10;
/** Combo grows by this much per consecutive clearing placement, capped below. */
export const COMBO_STEP = 0.5;
export const MAX_COMBO = 4;
/** Awarded for wiping the board completely. */
export const PERFECT_CLEAR_BONUS = 150;

/**
 * Points for clearing `lines` lines at once, before the combo multiplier.
 *
 * Quadratic rather than linear so that setting up a double or triple is worth
 * the risk: 1 line pays 10, 2 pays 40, 3 pays 90, 4 pays 160.
 */
export const lineScore = (lines: number): number =>
  lines === 0 ? 0 : POINTS_PER_LINE * lines * lines;

/** Multiplier from a run of consecutive clearing placements. */
export const comboMultiplier = (combo: number): number =>
  Math.min(1 + Math.max(0, combo - 1) * COMBO_STEP, MAX_COMBO);

export interface PlacementResult {
  grid: Grid;
  clearedRows: number[];
  clearedCols: number[];
  /** Cells the placement itself filled, for the drop animation. */
  placedCells: { r: number; c: number }[];
  /** Total points earned by this placement. */
  points: number;
  /** Breakdown, so the UI can show what earned what. */
  breakdown: {
    cells: number;
    lines: number;
    lineScore: number;
    combo: number;
    comboMultiplier: number;
    perfectClear: boolean;
  };
  /** The combo counter to carry into the next placement. */
  nextCombo: number;
}

/**
 * Places a shape, clears any full rows and columns, and scores the result.
 *
 * `combo` is the number of consecutive placements that have cleared something;
 * pass the previous result's `nextCombo`. A placement that clears nothing
 * breaks the run.
 */
export const place = (
  grid: Grid,
  shape: Shape,
  row: number,
  col: number,
  combo = 0,
): PlacementResult => {
  const next = grid.map((r) => [...r]);
  const placedCells: { r: number; c: number }[] = [];

  for (const c of shape.cells) {
    const r = row + c.r, cc = col + c.c;
    next[r][cc] = shape.color;
    placedCells.push({ r, c: cc });
  }

  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let r = 0; r < GRID; r++) {
    if (next[r].every((v) => v !== null)) clearedRows.push(r);
  }
  for (let c = 0; c < GRID; c++) {
    let full = true;
    for (let r = 0; r < GRID; r++) if (next[r][c] === null) { full = false; break; }
    if (full) clearedCols.push(c);
  }

  // Clear after detection, so a row and a column crossing each other both count.
  for (const r of clearedRows) for (let c = 0; c < GRID; c++) next[r][c] = null;
  for (const c of clearedCols) for (let r = 0; r < GRID; r++) next[r][c] = null;

  const lines = clearedRows.length + clearedCols.length;
  const nextCombo = lines > 0 ? combo + 1 : 0;
  const multiplier = lines > 0 ? comboMultiplier(nextCombo) : 1;
  const perfectClear = lines > 0 && next.every((r) => r.every((v) => v === null));

  const cellPoints = shape.cells.length * POINTS_PER_CELL;
  const linePoints = Math.round(lineScore(lines) * multiplier);
  const points = cellPoints + linePoints + (perfectClear ? PERFECT_CLEAR_BONUS : 0);

  return {
    grid: next,
    clearedRows,
    clearedCols,
    placedCells,
    points,
    breakdown: {
      cells: cellPoints,
      lines,
      lineScore: linePoints,
      combo: nextCombo,
      comboMultiplier: multiplier,
      perfectClear,
    },
    nextCombo,
  };
};

/** How many cells are occupied — drives the "board is filling up" warning. */
export const filledCount = (grid: Grid): number =>
  grid.reduce((sum, row) => sum + row.filter((v) => v !== null).length, 0);
