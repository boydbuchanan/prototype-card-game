import { TableShape } from "enums";

export interface Seat {
  index: number;
  /** Canvas coordinates of the seat's centre. */
  x: number;
  y: number;
  /** Degrees the seat panel is rotated by. 0 = facing the viewer from the bottom edge. */
  angle: number;
  /** Which edge of the table the seat sits on. */
  side: "bottom" | "left" | "top" | "right";
  /** True when no player occupies it — still rendered, so the shape is visible. */
  empty: boolean;
}

export interface TableLayout {
  shape: TableShape;
  /** Table size in canvas units. */
  width: number;
  height: number;
  seats: Seat[];
}

/** How many seats each shape provides for a given player count. */
export function seatCapacity(shape: TableShape, players: number): number {
  const n = Math.max(1, players);
  if (shape === TableShape.Square) {
    return 4 * Math.ceil(n / 4);
  }
  // Rectangle: up to four players sit two per long side and the ends stay closed.
  // Beyond that the ends open and the long sides grow.
  if (n <= 4) return 4;
  return 2 * Math.ceil((n - 2) / 2) + 2;
}

// A seat panel is roughly as wide as its widest zone (a row zone plus padding)
// and as tall as its rows stacked. These must exceed that, or seats overlap.
const SEAT_SLOT = 780;   // canvas units allotted to one seat along an edge
const TABLE_INSET = 560; // distance from table centre to a seat's centre, per axis

/**
 * Positions along one edge, centred on it. Two seats on a 1000-wide edge sit at
 * -250 and +250, three at -333/0/+333, and so on.
 */
function spread(count: number, span: number): number[] {
  if (count <= 0) return [];
  const step = span / count;
  return Array.from({ length: count }, (_, i) => -span / 2 + step * (i + 0.5));
}

/**
 * Seats for a table, in fill order: bottom edge first, then clockwise.
 * Seats beyond `players` are marked empty rather than omitted.
 */
export function buildTable(
  shape: TableShape = TableShape.Square,
  players: number = 1
): TableLayout {
  const capacity = seatCapacity(shape, players);
  const seats: Seat[] = [];

  const push = (side: Seat["side"], x: number, y: number, angle: number) => {
    seats.push({ index: seats.length, x, y, angle, side, empty: false });
  };

  if (shape === TableShape.Square) {
    const perSide = capacity / 4;
    const span = Math.max(perSide * SEAT_SLOT, SEAT_SLOT);
    const reach = span / 2 + TABLE_INSET;
    const offsets = spread(perSide, span);

    offsets.forEach((o) => push("bottom", o, reach, 0));
    offsets.forEach((o) => push("left", -reach, -o, 90));
    offsets.forEach((o) => push("top", -o, -reach, 180));
    offsets.forEach((o) => push("right", reach, o, 270));

    const seated = markEmpty(seats, players);
    return { shape, width: span + TABLE_INSET * 2, height: span + TABLE_INSET * 2, seats: seated };
  }

  // Rectangle
  const useEnds = capacity > 4;
  const perLong = (capacity - (useEnds ? 2 : 0)) / 2;
  const longSpan = Math.max(perLong * SEAT_SLOT, SEAT_SLOT);
  const shortSpan = SEAT_SLOT;
  const reachY = shortSpan / 2 + TABLE_INSET;
  const reachX = longSpan / 2 + TABLE_INSET;
  const along = spread(perLong, longSpan);

  along.forEach((o) => push("bottom", o, reachY, 0));
  if (useEnds) push("left", -reachX, 0, 90);
  along.forEach((o) => push("top", -o, -reachY, 180));
  if (useEnds) push("right", reachX, 0, 270);

  const seated = markEmpty(seats, players);
  return { shape, width: longSpan + TABLE_INSET * 2, height: shortSpan + TABLE_INSET * 2, seats: seated };
}

/** Fill seats in order; anything past the player count renders but is marked empty. */
function markEmpty(seats: Seat[], players: number): Seat[] {
  return seats.map((s, i) => ({ ...s, index: i, empty: i >= players }));
}
