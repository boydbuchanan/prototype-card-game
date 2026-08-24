import { TableShape } from "enums";
import { TableSize, toPx, RealUnit, DEFAULT_UNIT } from "./units";

export type SeatSide = "bottom" | "left" | "top" | "right";

export interface Seat {
  index: number;
  x: number;
  y: number;
  angle: number;
  side?: SeatSide;
}

export interface TableLayout {
  shape: TableShape;
  /** Table footprint in canvas px. */
  width: number;
  height: number;
  seats: Seat[];
}

/**
 * Positions along one edge, centred on it. One seat sits at 50%, two at 25% and
 * 75%, three at 1/6, 1/2, 5/6 — the fractions real place settings fall on.
 */
export function spread(count: number, span: number): number[] {
  if (count <= 0) return [];
  const step = span / count;
  return Array.from({ length: count }, (_, i) => -span / 2 + step * (i + 0.5));
}

const flip = (v: number) => (v === 0 ? 0 : -v);

/**
 * Trig leaves float dust — sin(pi) is 1.2e-16, which reaches the DOM as
 * `translate(2.1e-13px, ...)`. Round to a hundredth of a pixel, well below
 * anything visible, so coordinates read cleanly.
 */
const tidy = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? 0 : r;
};

/**
 * How many seats land on each edge.
 *
 * Square: one per edge before any edge doubles up, ordered bottom, top, left,
 * right — so two players face each other and four get a side each.
 *
 * Rectangle: people fill a long table's sides before they take an end. Two per
 * long side first (so 1–4 sit two and two across from each other), then the two
 * ends, then the long sides keep growing — 7 and 8 make it three a side.
 */
export function distribute(
  shape: TableShape,
  players: number,
  size?: TableSize
): Record<SeatSide, number> {
  const n = Math.max(0, players);
  const counts: Record<SeatSide, number> = { bottom: 0, top: 0, left: 0, right: 0 };
  const add = (order: SeatSide[]) => order.slice(0, n).forEach((side) => { counts[side]++; });

  if (shape === TableShape.Square) {
    const cycle: SeatSide[] = ["bottom", "top", "left", "right"];
    for (let i = 0; i < n; i++) counts[cycle[i % 4]]++;
    return counts;
  }

  // Which edges are actually the long ones, so the rule holds whichever way
  // round the table was authored.
  const widthIsLong = !size || size.width >= size.height;
  const long: SeatSide[] = widthIsLong ? ["bottom", "top"] : ["left", "right"];
  const ends: SeatSide[] = widthIsLong ? ["left", "right"] : ["bottom", "top"];

  const order: SeatSide[] = [long[0], long[1], long[0], long[1], ends[0], ends[1]];
  for (let i = 0; order.length < n; i++) order.push(long[i % 2]);
  add(order);
  return counts;
}

/**
 * Seats for a table of a given size. The table's size is authored, never derived
 * from the seats: a board that does not fit overhangs its neighbour, and seeing
 * that is the point.
 */
export function buildTable(
  shape: TableShape = TableShape.Square,
  players: number = 1,
  size: TableSize = { width: 60, height: 60 },
  unit: RealUnit = DEFAULT_UNIT
): TableLayout {
  const width = toPx(size.width, unit);
  const height = toPx(size.height, unit);
  const seats: Seat[] = [];
  const n = Math.max(0, players);

  if (shape === TableShape.Round) {
    // Evenly around the circumference, first seat at the bottom facing up.
    const r = width / 2;
    for (let i = 0; i < n; i++) {
      const deg = (360 / n) * i;
      const rad = (deg * Math.PI) / 180;
      seats.push({
        index: i,
        x: tidy(r * Math.sin(rad)),
        y: tidy(r * Math.cos(rad)),
        // A seat at the bottom (deg 0) faces up, i.e. angle 0. Going anticlockwise
        // round the table turns the seat by the same amount.
        angle: flip(deg),
      });
    }
    return { shape, width, height, seats };
  }

  const counts = distribute(shape, n, size);
  // Each edge is spread by its own length — a rectangle's ends are not its sides.
  const offsets: Record<SeatSide, number[]> = {
    bottom: spread(counts.bottom, width),
    top: spread(counts.top, width),
    left: spread(counts.left, height),
    right: spread(counts.right, height),
  };

  // Interleaved so seat 0 is the first bottom seat, seat 1 the first top seat and
  // so on: the seat index is the player number, and players should fill the table
  // evenly rather than crowd one edge.
  const cursors: Record<SeatSide, number> = { bottom: 0, top: 0, left: 0, right: 0 };
  const order: SeatSide[] =
    shape === TableShape.Square
      ? ["bottom", "top", "left", "right"]
      : ["left", "right", "bottom", "top"];

  const place = (side: SeatSide, o: number): Seat => {
    switch (side) {
      case "bottom": return { index: seats.length, x: tidy(o), y: tidy(height / 2), angle: 0, side };
      case "left":   return { index: seats.length, x: tidy(-width / 2), y: tidy(flip(o)), angle: 90, side };
      case "top":    return { index: seats.length, x: tidy(flip(o)), y: tidy(-height / 2), angle: 180, side };
      case "right":  return { index: seats.length, x: tidy(width / 2), y: tidy(o), angle: 270, side };
    }
  };

  while (seats.length < n) {
    let placed = false;
    for (const side of order) {
      if (cursors[side] >= counts[side]) continue;
      seats.push(place(side, offsets[side][cursors[side]++]));
      placed = true;
      if (seats.length >= n) break;
    }
    if (!placed) break; // counts exhausted; guards against a bad distribute()
  }

  return { shape, width, height, seats };
}
